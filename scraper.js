const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const fs = require('fs')
const puppeteer = require('puppeteer')
const fuzzysearch = require('fuzzysearch')
const baseDir = 'https://www.google.com/search?'

app.use(express.static(__dirname + '/'))

let browser
let pageOne, pageTwo, pageThree, pageFour
let a1Count, a2Count, a3Count = 0
let counter = 0
let startTime, endTime
let answersObject = {}
let answersExact = {}
let pages = [pageOne, pageTwo, pageThree, pageFour]
let rcSectionText = ""

async function launchPuppeteer () {
	browser = await puppeteer.launch({ headless: true }); 
	pageOne = await browser.newPage();
	pageTwo = await browser.newPage();
	pageThree = await browser.newPage();
	pageFour = await browser.newPage();
	pageOne.goto(baseDir)
	pageTwo.goto(baseDir)
	pageThree.goto(baseDir)
	pageFour.goto(baseDir)
	console.log("launched")
}

async function screenshotDOMElement(page, selector, path = 'example.png', padding = 0) {
	const rect = await page.evaluate(selector => {
		const element = document.querySelector(selector);
		const { x, y, width, height } = element.getBoundingClientRect();
		return { left: x, top: y, width, height, id: element.id };
	}, selector);

	return await page.screenshot({
		path: path,
		clip: {
			x: rect.left - padding,
			y: rect.top - padding,
			width: rect.width + padding * 2,
			height: 1000
		}
	});
}

async function runGoogle (opts, captureScreenshot=false, screenshotName='example.png') {
	let { page, queryString, answers, div, doubleWeight} = opts

	if (queryString) {
		await page.goto(`${baseDir}q=${queryString}`);
		await page.waitForSelector('.rc')
		let rcSectionText = await page.evaluate(() => {
			var countOfSections = document.getElementsByClassName('rc').length
			var text = ""
			for (var i = 0; countOfSections > i; i++) {
				text += document.getElementsByClassName('rc')[i].innerText + "<br><br>"
			}
			return text
		})
		await page.evaluate(() => {
			document.querySelectorAll('b')
			for (i = 0; document.querySelectorAll('b').length > i; i++) {
				document.querySelectorAll('b')[i].style.backgroundColor = 'yellow'
			}
			for (i = 0; document.querySelectorAll('em').length > i; i++) {
				document.querySelectorAll('em')[i].style.backgroundColor = 'yellow'
			}			
		})
		// rcSectionText = rcSectionText.toLowerCase()
		regexes = answers.map((answer) => new RegExp(answer,'gi'))
		regexes.forEach((regex,i) => {
			if (typeof (answersExact[answers[i]]) !== "number") answersExact[answers[i]] = 0
			if (rcSectionText.match(regex)) {
				if (doubleWeight) {
					answersExact[answers[i]] += (rcSectionText.match(regex).length * 2)
				} else {
					answersExact[answers[i]] += rcSectionText.match(regex).length
				}
			}
		})

		var splitWords = rcSectionText.split(" ")
		var countOfWords = splitWords.length
		
		for (var w = 0; countOfWords > w; w++) {
			let word = splitWords[w]
			answers.forEach((answer, i) => {
				if (fuzzysearch(word, answer)) answersObject[answer] += 1
			})
			if (captureScreenshot) {
				fullText = rcSectionText
				regexes.forEach((regex,i) => {
					fullText = fullText.replace(regex, `<span class="highlight" style="background-color: #FF0">${answers[i]}</span>`)							
				})
			}
			if (countOfWords - 1 === w) incrementCounter()
		}

		if (captureScreenshot) {
			await screenshotDOMElement(page, '#res', screenshotName)
			fs.readFile(`${__dirname}/${screenshotName}`, function (err, buf) {
				if (err) {console.log("ERROR")}
				io.emit('image', { 
					image: true, 
					buffer: buf.toString('base64'), 
					div: div 
				});
			});
		}
	}
}

function incrementCounter() {
	console.log('incrementing')
	console.log(counter)
	counter += 1
	executionTime = undefined
	if (counter == 4) {
		endTime = new Date()
		executionTime = answersObject.executionTime = endTime - startTime
		counter = 0
	}
	io.emit('results', { 
		fuzzy: answersObject, 
		exact: answersExact, 
		counter: counter, 
		executionTime: executionTime,
		htmlText: fullText
	})
}

function parameterizeString (queryString) {
	if (queryString !== undefined) {
		return queryString.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
	} else {
		return false
	}
}

function buildQueryStringsArray(q, answerArr) {
	var queryArr = [q]
	answerArr.forEach((el, i) => {
		queryArr.push(`${q} ${el}`)
	})
	return queryArr
}

launchPuppeteer()
app.get('/results', (req, res) => {
	console.log('yo')
	console.log('in /results')
	res.sendFile(__dirname + '/index.html');
})

app.post('/begin_search', (req, res) => {
	io.emit('begin search', { searching: true })
	res.send('')
})

app.get('/query', (req, res) => {
	fullText = ""
	answersObject = {}
	answersExact = {}
	startTime = new Date()
	rcSectionText = ""
	var question = req.query.question
	var answers = [req.query.one.toLowerCase(), req.query.two.toLowerCase(), req.query.three.toLowerCase()]
	var queryStrings = buildQueryStringsArray(question, answers)
	io.emit('parsed question', { 
		question,
		answers
	})
	if (queryStrings[0] !== undefined) {
		answers.forEach((answer, i) => {answersObject[answer] = 0 })
		runGoogle({ div: 'image-one', page: pageOne, queryString: queryStrings[0], answers: answers, doubleWeight: true}, true, 'search1.png')
		runGoogle({ div: 'image-two', page: pageTwo, queryString: queryStrings[1], answers: answers }, false, 'search2.png')
		runGoogle({ div: 'image-three', page: pageThree, queryString: queryStrings[2], answers: answers }, false, 'search3.png')
		runGoogle({ div: 'image-four', page: pageFour, queryString: queryStrings[3], answers: answers }, false, 'search4.png')
	}
	res.sendFile(__dirname + '/index.html');
})

io.on('connection', (socket) => {
	console.log('a user connected');
	io.on('disconnect', () => {
		console.log('disconnected')
	})
});

http.listen(3000, () => { console.log('listening on *:3000') } )