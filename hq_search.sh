#!/bin/bash

echo $(date)
curl -X POST http://localhost:3000/begin_search
screencapture -R0,0,420,550 'test.png'
INFILE='./test.png'
CROPFILE='./cropfile.jpg'
BASEDIR=$(pwd)
CROPFILE="$BASEDIR/output.jpg"
QUESTION_IMAGE_PATH="$BASEDIR/question.jpg"
ANSWER_IMAGE_PATH="$BASEDIR/all_answers.jpg"
if [ "$1" == "THE_Q" ] 
then
    echo "THE Q"
    # ./textcleaner.sh -g -s 1 $INFILE $CROPFILE 
    convert $INFILE -crop 800x370+20+290 $ANSWER_IMAGE_PATH
    convert $INFILE -crop 900x240+0+10 $QUESTION_IMAGE_PATH
elif [ "$1" == "GENIUS" ]
then 
    echo "GENIUS"
    ./textcleaner.sh -g -s 1 $INFILE $CROPFILE 
    convert $CROPFILE -crop 820x200+30+230 $QUESTION_IMAGE_PATH
    convert $CROPFILE -crop 650x500+120+450 $ANSWER_IMAGE_PATH
else 
    echo "HQ"
    ./textcleaner.sh -g -s 1 $INFILE $CROPFILE 
    convert $CROPFILE -crop 800x300+30+330 $QUESTION_IMAGE_PATH
    convert $CROPFILE -crop 780x400+40+650 $ANSWER_IMAGE_PATH
fi

tesseract $QUESTION_IMAGE_PATH ./question
tesseract $ANSWER_IMAGE_PATH ./answers
echo $(date)
ruby parser.rb    
