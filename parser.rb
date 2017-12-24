require 'httparty'
require 'pry'
require 'time'
starting = Time.now
puts 'in ruby'
question_string = ""
File.open('./question.txt') {|f|
    question_string = f.read.gsub("\n"," ")
}

answers = []
File.open('./answers.txt') {|f|
    f.each_line do |line|
        if line.gsub(" ","").chomp.length > 0
            line.gsub!("I(", "k")
            answers << line.chomp 
        end
    end
}
params = {
    question: question_string,
    one: answers[0],
    two: answers[1],
    three: answers[2]    
}
ending = Time.now
puts (ending.to_f - starting.to_f)

puts params
puts 'in ruby'
HTTParty.get("http://localhost:3000/query", query: params)
puts 'in ruby'