const fs = require('fs');
const _ = require('underscore');
const inquirer = require('inquirer');
const spotify = require('spotify-web-api-node');
const keys = require('./keys');
const clear = require('clear');
const request = require('request');
const cfonts = require('cfonts');

/* 
JavaScript classes, introduced in ECMAScript 2015, 
are primarily syntactical sugar over JavaScript's existing prototype-based 
nheritance. The class syntax is not introducing 
a new object-oriented inheritance model to JavaScript. 
JavaScript classes provide a much simpler 
and clearer syntax to create objects and deal with inheritance.

 LINK: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
*/

//I used 'class' because it makes prototype methods inside the object automatically
//and it looks neater, compared to using constructor functions.


//WORD CLASS
class Word{
	constructor(word)
	{
		this.word = word.trim();
		this.length = word.trim().length;
		this.wordArray = word.split('');
		this.letters = ((a)=>{
							let arr = _.filter(a, n => n != ' ');
							arr = _.uniq(arr);
							arr = arr.sort();
							return arr
						})(this.word.toLowerCase().split(''))
	}

	//check if word contains a letter
	contains(l){
		return _.contains(this.letters, l)
	}
}

//GAME CLASS
class Game{
	constructor()
	{
		this.attemptsLeft = 10;
		this.round = 0;
		this.currentWord = null;
		this.guessedLetters = [];
		this.words = [];
		this.songs = [];
		this.guessedWord = [];
		this.plot = '';
		this.mode = '';
	}

	//MAIN MENU
	mainMenu(){
		clear();
			cfonts.say('HANGMAN', 
			{
				font: 'block',
				align: 'left',  //define the background color 
    			letterSpacing: 3,     //define letter spacing 
    			lineHeight: 2,        //define the line height 
    			space: false,          //define if the output text should have empty lines on top and on the bottom 
    			maxLength: '0' 
			});
		return new Promise((resolve, reject) => {
			//console.log('\r\n')
			//console.log("WELCOME TO HANGMAN CLI!\r\n")
			inquirer.prompt([
				{
					type: 'list',
					message: 'MAIN MENU',
					choices: [new inquirer.Separator(), "Guess the Song (from BillBoard 100)", "Get Words from .txt File", "Movie Category", "People Category", new inquirer.Separator(), "Exit"],
					name: 'c'
				}
			]).then(a => {
				switch (a.c)
				{
					case 'Guess the Song (from BillBoard 100)':
						this.mode = 'billboard100'
						this.gameInit();
					break;
					case 'Get Words from .txt File':
						this.mode = 'txt'
						inquirer.prompt([
							{message: 'Input .txt File Name: ', name: 'filename'}
						]).then(fname => {this.gameInit(fname.filename)})
					break;
					case 'Movie Category':
						this.mode = 'movie';
						this.gameInit('movies.txt')
					break;
					case 'People Category':
						this.mode = 'txt'
						this.gameInit('people.txt')
					break;
					case 'Exit':
						process.exit();
					break;
				}
			})
		})
	}

	//GET MOVIE PLOT
	getPlot(movie_title)
	{
		return new Promise((resolve, reject) => {
			request(`http://www.omdbapi.com/?apikey=40e9cece&t=${movie_title}&tomatoes=true&r=json`, 
			(err, res, data) => {
				if (err) return console.log(err)
				{
					let movie = JSON.parse(data)
					//console.log(movie.Plot);
					resolve(movie.Plot);
				}
			})
		})
		
	}


	//GET WORDS FROM LOCAL FILE (words separated by newlines)
	getWords(file = 'words.txt'){
		return new Promise((resolve, reject) =>{
			fs.readFile(file, 'utf8', (err, data) =>{
				if (err) reject(Error("FILE INVALID"));

				//SPLIT WORDS BY NEWLINE
				if (data != null)
					resolve(data.split('\r\n'));
				else
					reject(Error("DATA EMPTY"))
			})
		}).then(a => {
			a.forEach(v => this.words.push(new Word(v)));
			//console.log(this.words);
		}, e => {console.log(e)})
	}


	//GET SONGS FROM SPOTIFY PLAYLIST -- BILLBOARD 100
	getWordsfromSpotify(){
		return new Promise((resolve, reject) => {
			var s = new spotify(keys.spotify);
			s.clientCredentialsGrant().then(res => {
				s.setAccessToken(res.body['access_token']);
				var tracks = [];
				s.getPlaylist('billboard.com', '6UeSakyzhiEt4NB3UAd6NQ').then(track_data =>{
					resolve(track_data.body.tracks.items);
				})
			})
		}).then(a => {
			//PROCESS DATA FROM SPOTIFY API SEARCH
			a.forEach(v => {
				this.songs.push({
					title: v.track.name,
					album: v.track.album.name,
					artist:(() => {
						var artists = [];
						v.track.artists.forEach(artist => {artists.push(artist.name)});
						return artists.join(', ')
					})()
				})
			})
			//console.log(this.songs);
		}, e => {console.log(e)});
	}

	//CHOOSE ONE WORD FROM THIS.WORDS ARRAY
	chooseWord(){
		let r = Math.floor(Math.random()*(this.words.length));
		this.currentWord = this.words[r];
		if (this.mode == 'movie') this.getPlot(this.currentWord.word).then(v => {this.plot = v});
	}

	//CHOOSE A SONG
	chooseSong(){
		let r = Math.floor(Math.random()*this.songs.length)
		this.currentSong = this.songs[r];
		this.currentWord = new Word(this.currentSong.title);
	}

	//CREATE BLANKS (ASTERISKS) BASED ON CURRENT WORD
	createBlank(){
		this.currentWord.wordArray.forEach(v => {
			if (/^[a-zA-Z0-9]+$/.test(v) == true)
				this.guessedWord.push('*')
			else this.guessedWord.push(v);
		})
	}

	//UPDATE GUESSED WORD
	updateGuessedWord(v){
		for (let i = 0; i < this.currentWord.wordArray.length; i++)
		{
			if (this.currentWord.wordArray[i].toLowerCase() == v)
			{
				this.guessedWord[i] = this.currentWord.wordArray[i];
			}
		}
	}

	//GET GUESSED WORD IN STRING
	get stringGuessed(){
		let s = '';
		this.guessedWord.forEach(v => {
			s += ' '+v;
		})
		return s;
	}

	//GET GUESSED LETTERS IN STRING
	get guessedLettersStr(){
		return this.guessedLetters.join(' ').toUpperCase();
	}

	//PRINT GAME DETAILS
	gameDetail(){
		clear(true);
		console.log("\r\n =======================================================");
		console.log("  ROUND "+this.round)
		console.log(" =======================================================\r\n");
		console.log(" "+this.stringGuessed);
		console.log('\r\n');
		if (this.mode == 'billboard100') console.log(`  Artist: ${this.currentSong.artist}`);
		if (this.mode == 'movie' && this.plot != ''){ 
			let p = this.plot.split(' ');
			let m = '  Plot:';
			for (let i in p){
				if (i % 10 != 0 || i == 0) m += " "+p[i];
				else {
					console.log(m);
					m = '       ';
				}
			}
			console.log(m);
		} 
		console.log(`  Number of Attempts: ${this.attemptsLeft}`);
		console.log(`  Letters Guessed: ${this.guessedLettersStr}`)
		console.log(" =======================================================");
	}


	//GET DATA FROM SPOTIFY
	gameInit(fn = 'words.txt'){
		this.words = [];
		if (this.mode == 'billboard100')
		{
			var dot = 0;
			var load = setInterval(function(){
				clear(true);
				var period = ' .';
				console.log("Loading"+period.repeat(dot));
				dot++;
				if (dot == 6) dot = 0;
			}, 50);
			this.getWordsfromSpotify().then(a => {
				//REINITIALIZE VARIBLES
				clearInterval(load);
				this.initAgain();
			}, err => {console.log(err)});
		}
		else if (this.mode == 'txt' || this.mode == 'movie')
		{
			this.getWords(fn).then(a => {
				//REINITIALIZE VARIBLES
				this.initAgain();
			}, err => {console.log(err)});
		}
		
	}
	
	//REINITIALIZE, WITHOUT GETTING DATA FROM SPOTIFY
	initAgain(mode){
		this.attemptsLeft = 10;
		this.guessedLetters = [];
		this.guessedWord = [];
		this.plot = '';
		this.round++;
		
		if (this.mode == 'billboard100')
			this.chooseSong();
		else this.chooseWord();

		this.createBlank();
		this.gameDetail();
		this.play()
	}

	//INQUIRE USER IF THEY WANT TO PLAY AGAIN
	playAgainInquire(){
		inquirer.prompt([
					{type: 'list', name: 'again', choices: ['Yes', 'Main Menu', 'Quit'], message: 'Play Again? '}
				]).then(a2 => {
					if (a2.again == 'Yes')
						this.initAgain();
					else if (a2.again == 'Main Menu')
					{
						this.mainMenu();
					}
					else{
						console.log("Thanks for playing!")
						process.exit();
					}
				})
	}

	//GAME
	play(){
		inquirer.prompt([
			{name: 'letterInput', message: 'Pick a letter: '}
		]).then(a => {
			//CHECK VALIDITY OF CHARACTER (ONE CHAR, A-Z only)
			if (a.letterInput.length == 1 && /^[a-zA-Z0-9]+$/.test(a.letterInput) == true)
			{
				//IF LETTER ALREADY GUESSED
				if (_.contains(this.guessedLetters, a.letterInput.toLowerCase())){
					console.log("You already tried this letter!")
				}
				//IF LETTER IS CORRECT
				else if (this.currentWord.contains(a.letterInput.toLowerCase())){
					this.updateGuessedWord(a.letterInput.toLowerCase())
					this.guessedLetters.push(a.letterInput.toLowerCase());
					this.gameDetail();
				}
				//IF LETTER IS INCORRECT
				else{
					this.attemptsLeft--;
					this.guessedLetters.push(a.letterInput.toLowerCase());
					this.gameDetail();
				}
				
			}
			else
			{
				//DISLAY ERROR
				console.log("Invalid Character. Please Try Again")
			}

			//CHECK IF YOU WIN THE GAME
			if (this.attemptsLeft == 0)
			{
				console.log("YOU LOSE! The answer is '"+this.currentWord.word +'\'\r\n');
				this.playAgainInquire();
			}
			else if (this.guessedWord.join('') != this.currentWord.wordArray.join(''))
				this.play(); //REPEAT
			else{
				console.log("  YOU WIN!\r\n")
				this.playAgainInquire();
			}
		})
	}
}

var game = new Game();
game.mainMenu();
