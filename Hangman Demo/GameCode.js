 'use strict';

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        //console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

//     if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.05aecccb3-1461-48fb-a008-822ddrt6b516") {
//         context.fail("Invalid Application ID");
//      }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            console.log(event.request.type);
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            console.log(event.request.type);
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            console.log(event.request.type);
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    //console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
    //    + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    //console.log("onLaunch requestId=" + launchRequest.requestId
    //    + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent Function");
 
    //console.log("onIntent requestId=" + intentRequest.requestId
    //    + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;
        
    console.log(intentName);

    // handle yes/no intent after the user has been prompted
    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;
        if ("AMAZON.NoIntent" === intentName) {
            handleFinishSessionRequest(intent, session, callback);
        } else if ("AMAZON.YesIntent" === intentName) {
            handleRepeatRequest(intent, session, callback);
        }
    }

    // dispatch custom intents to handlers here
    if ("ChooseGameIntent" == intentName && session.attributes.currentGame === null) {
        handleChooseGameRequest(intent, session, callback);
    } else if ("ChooseGameOnlyIntent" == intentName && session.attributes.currentGame === null) {
        handleChooseGameRequest(intent, session, callback);
    } else if ("HangmanGuessIntent" == intentName && session.attributes.currentGame == "hangman" && session.attributes.word !== null) {
        handleHangmanGuess(intent, session, callback);
    } else if ("DifficultyIntent" == intentName && session.attributes.currentGame == "hangman" && session.attributes.difficulty === null) {
        hangmanDifficulty(intent, session, callback);
    } else if ("CurrentWordIntent" == intentName && session.attributes.currentGame == "hangman" && session.attributes.word !== null) {
        hangmanCurrentWord(intent, session, callback);
    } else if ("ListGuessesIntent" == intentName && session.attributes.currentGame == "hangman" && session.attributes.word !== null) {
        hangmanGuessedLetters(intent, session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        handleRepeatRequest(intent, session, callback);
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    //console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
    //    + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

// ------- Skill specific business logic -------
var CARD_TITLE = "Party Games";
var hardWords = ["jazz", "polyrhythms", "drywall", "krypton", "blotchy",
                "python", "zephyr", "syncing", "brawny", "martyr", 
                "gryphon", "gymnast", "yacht", "pyre"];
var easyWords = ["account", "reason", "coal", "group", "memory", "powder", 
                "impulse", "servant", "country", "test", "word", "year",
                "opinion", "discussion", "history"];

function getWelcomeResponse(callback) {
    console.log("getWelcomeResponse Function");
 
    var sessionAttributes = {},
        speechOutput = "Which game would you like to play? The currently supported games are hangman, fortunately unfortunately, and quizzer.",
        supportedGames = "The currently supported games are hangman, fortunately unfortunately, and quizzer.",
        shouldEndSession = false;

    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": "That is not a valid response. " + speechOutput,
        "currentGame": null
    };
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, supportedGames, shouldEndSession));
}

function handleHangmanGuess(intent, session, callback) {
    console.log("handleHangmanGuess Function");
 
    var guess = intent.slots.Guess.value.substring(0,1).toLowerCase();
    console.log(guess);
    var shouldEndSession = false;
    var isInWord = false;
    var speechOutput = "";
    var sessionAttributes = {};
    
    // guess has already been guessed
    if (session.attributes.guesses.indexOf(guess) > -1) {
        var wordStr2 = session.attributes.guessedWord.join().toLowerCase();
        speechOutput = "You have already guessed the letter " + guess + ". A life has not been taken from you. The current word is " + wordStr2 + ". You have " + 
        String(session.attributes.lives) + " lives left. Guess a letter."
        
        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": "That command is not valid. " + speechOutput,
            "currentGame": "hangman",
            "word": session.attributes.word,
            "guessedWord": session.attributes.guessedWord,
            "lives": session.attributes.lives,
            "guesses": session.attributes.guesses,
            "difficulty": session.attributes.difficulty
        };
        
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
    } 
    //guess is a new letter
    else {
        session.attributes.guesses.push(guess);
        
        for (var i = 0; i < session.attributes.word.length; i++) {
            if (session.attributes.word[i] == guess) {
                isInWord = true;
                session.attributes.guessedWord[i] = guess;
            }
        }
    
        var wordStr = session.attributes.guessedWord.join().toLowerCase();
        if (isInWord) {
            if (wordStr.replace(/,/g, "") != session.attributes.word.toLowerCase()) {
                speechOutput = "Well done! The current word is " + wordStr + ". You have " + String(session.attributes.lives) +
                    "lives left. Guess a letter.";
            } else {
                speechOutput = "Congratulations, you win! The word was " + session.attributes.word;
                shouldEndSession = true;
            }
        } else {
            session.attributes.lives = session.attributes.lives - 1;
            if (session.attributes.lives > 0) {
                speechOutput = "Oh no, " + guess + " was not in the word! The current word is " + wordStr + ". You have " + String(session.attributes.lives) +
                    " lives left. Guess a letter.";
            } else {
                speechOutput = "Oh no, " + guess + " was not in the word! You are out of lives. You lose! The word was " + session.attributes.word;
                shouldEndSession = true;
            }
        }
   
        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": "That command is not valid. " + speechOutput,
            "currentGame": "hangman",
            "word": session.attributes.word,
            "guessedWord": session.attributes.guessedWord,
            "lives": session.attributes.lives,
            "guesses": session.attributes.guesses,
            "difficulty": session.attributes.difficulty
        };
    
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
    }
}

function handleChooseGameRequest(intent, session, callback) {
    console.log("handleChooseGameRequest Function");
 
    var speechOutput = "";
    var sessionAttributes = {};
    var gameName = intent.slots.Game.value;
    
    if (gameName == "hangman") {
        launchHangman(intent, session, callback);
    } else if (gameName == "fortunately unfortunately") {
        launchFortunatelyUnfortunately(intent, session, callback);
    } else if (gameName == "quizzer") {
        launchQuizzer(intent, session, callback);
    } else {
        throw "Invalid Intent";
    }
}

function launchHangman(intent, session, callback) {
    console.log("launchHangman Function");
 
    var speechOutput = "Launching Hangman. Which difficulty would you like to play on, easy or hard?";
    var shouldEndSession = false;
    
    var sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": "That command is not valid. " + speechOutput,
        "currentGame": "hangman",
        "word": null,
        "guessedWord": null,
        "lives": null,
        "guesses": null,
        "difficulty": null
    };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
}

function hangmanDifficulty(intent, session, callback) {
    console.log("hangmanDifficulty Function");
 
    var shouldEndSession = false;
    var word = "";
    var speechOutput = "";
    var randInt;
    var sessionAttributes = {};
    
    if (intent.slots.Difficulty.value == "easy") {
        randInt = Math.floor(Math.random()*easyWords.length);
        word = easyWords[randInt];
        
        speechOutput = "You are playing on easy difficulty. To guess a letter, just say the letter. You may also use the Nato Phonetic alphabet. To hear what letters you have guessed,"
            + " say What have I guessed. To hear your current word, ask What is my current word. You have 6 lives. Your word is " + String(word.length)
            + " letters long. Good luck! Guess a letter.";
            
        //speechOutput = speechOutput + " The word is " + word;    
        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": "That command is not valid. " + speechOutput,
            "currentGame": "hangman",
            "word": word,
            "guessedWord": Array(word.length).fill("blank"),
            "lives": 6,
            "guesses": [],
            "difficulty": "easy"
        };
        
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
    } else {
        randInt = Math.floor(Math.random()*hardWords.length);
        word = hardWords[randInt];
        
        speechOutput = "You are playing on hard difficulty. To guess a letter, just say the letter. You may also use the Nato Phonetic alphabet. To hear what letters you have guessed,"
            + " ask: What have I guessed. To hear your current word, ask: What is my current word. You have 4 lives. Your word is " + String(word.length)
            + " letters long. Good luck! Guess a letter.";
            
        //speechOutput = speechOutput + " The word is " + word;
        
        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": "That command is not valid. " + speechOutput,
            "currentGame": "hangman",
            "word": word,
            "guessedWord": Array(word.length).fill("blank"),
            "lives": 4,
            "guesses": [],
            "difficulty": "hard"
        };
        
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
    }
    
}

function hangmanGuessedLetters(intent, session, callback) {
    console.log("hangmanGuessedLetters Function");
 
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var wordStr = "";
    
    if (session.attributes.guesses.length < 1) {
        wordStr = session.attributes.guessedWord.join().toLowerCase();
        speechOutput = "You have not guessed a letter yet. The current word is: " + wordStr + ". You have " + String(session.attributes.lives)
        + " lives left. Guess a letter.";
        
        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": "That command is not valid. " + speechOutput,
            "currentGame": "hangman",
            "word": session.attributes.word,
            "guessedWord": session.attributes.guessedWord,
            "lives": session.attributes.lives,
            "guesses": session.attributes.guesses,
            "difficulty": session.attributes.difficulty
        };
        
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
            
    } else {
        console.log(session.attributes.guesses);
        var letters = session.attributes.guesses.toString().toLowerCase();
        wordStr = session.attributes.guessedWord.join().toLowerCase();
    
        speechOutput = "You have guessed the following letters: " + letters + 
            ". The current word is: " + wordStr + ". You have " + String(session.attributes.lives)
            + " lives left. Guess a letter.";
    
        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": "That command is not valid. " + speechOutput,
            "currentGame": "hangman",
            "word": session.attributes.word,
            "guessedWord": session.attributes.guessedWord,
            "lives": session.attributes.lives,
            "guesses": session.attributes.guesses,
            "difficulty": session.attributes.difficulty
        };
        
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
    }
}
function hangmanCurrentWord(intent, session, callback) {
    console.log("hangmanCurrentWord Function");
    
    var shouldEndSession = false;
    var wordStr = session.attributes.guessedWord.join().toLowerCase();
    var speechOutput = "Your current word is: " + wordStr + ". You have " + String(session.attributes.lives) + " lives left. Guess a letter.";
    
    var sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": "That command is not valid. " + speechOutput,
            "currentGame": "hangman",
            "word": session.attributes.word,
            "guessedWord": session.attributes.guessedWord,
            "lives": session.attributes.lives,
            "guesses": session.attributes.guesses,
            "difficulty": session.attributes.difficulty
        };
        
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, shouldEndSession));
}

function launchFortunatelyUnfortunately(intent, session, callback) {
    console.log("launchFortunatelyUnfortunately Function");
    
    var speechOutput = "Launching Fortunately Unfortunately.";
    var shouldEndSession = true;
    var sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": "That command is not valid. " + speechOutput,
        "currentGame": "forunately unfortunately"
    };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput + " Ending demo. Goodbye!", speechOutput + " Ending demo. Goodbye!", shouldEndSession));
}

function launchQuizzer(intent, session, callback) {
    console.log("launchQuizzer Function");
    
    var speechOutput = "Launching Quizzer.";
    var shouldEndSession = true;
    var sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": "That command is not valid. " + speechOutput,
        "currentGame": "quizzer"
    };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput + " Ending demo. Goodbye!", speechOutput + " Ending demo. Goodbye!", shouldEndSession));
}

function handleRepeatRequest(intent, session, callback) {
    console.log("handleRepeatRequest Function");
    
    // Repeat the previous speechOutput and repromptText from the session attributes if available
    // else start a new game session
    if (!session.attributes || !session.attributes.speechOutput) {
        getWelcomeResponse(callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.repromptText, session.attributes.repromptText, false));
    }
}


function handleFinishSessionRequest(intent, session, callback) {
    console.log("handleFinishSessionRequest Function");
    
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Good bye!", "", true));
}

// ------- Helper functions to build responses -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

