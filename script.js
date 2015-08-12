$(document).ready(function($){

/*-------------------
VARIABLE DECLARATIONS
-------------------*/

	//key signatures (major only: minor keys are grouped with their companion major key)
	var keys = {
		c: ['c','d','e','f','g','a','b'], 
		cs: ['cs','ds','f','fs','gs','as','c'],
		d: ['d','e','fs','g','a','b','cs'], 
		ds: ['ds','f','g','gs','as','c','d'],
		e: ['e','fs','gs','a','b','cs','ds'],
		f: ['f','g','a','as','c','d','e'],
		fs: ['fs','gs','as','b','cs','ds','f'],
		g: ['g','a','b','c','d','e','fs'], 
		gs: ['gs','as','c','cs','ds','f','g'],
		a: ['a','b','cs','d','e','fs','gs'], 
		as: ['as','c','d','ds','f','g','a'],
		b: ['b','cs','ds','e','fs','gs','as']
	}

	var tempo = 120, //default tempo
		playthrough=0, //container for setInterval
		parentTrack = 0, //stores .parent() calls from notes
		pos = 0, //stores current column of notes during playback
		imageUrl = 'img/stop.png', //background image of playstop button
		loop = false, //flag to allow/stop looping after playback
		inst = false, //stores howler sprite, changes depending on instrument sle
		$currentTrack, //stores .parent() calls from instrument change button
		$currentInstButton, //stores the instrument button that called the instrument selection menu
		measureCount = 0, //number of measures (set of 16 note columns) in the project
		buttonSize = $(window).height() / 15; //define button size relative to window height
		maxTracks = 5 //maximum allowed number of tracks

/*---------------------------------
CUSTOM FUNCTIONS / LOADING ELEMENTS
---------------------------------*/

	//add 16 columns of notes to each track in the project
	var addMeasure = function(){
		
		//keep track of the new measure
		measureCount++;

		//keep adding columns until there are 16 times the measure count (accounting for the number of tracks)
		while(($('.col').length/$('.track').length) < measureCount*16) {
			
			//add black line every 4th note to mark a new bar
			if(($('.col').length/$('.track').length) % 4 == 1) {
				$('.track').each(function(){
					$(this).children('.col').last().children().css('border-left', 'solid 1px black');
				});
			}
			else {
				$('.track').each(function(){
					$(this).children('.col').last().children().css('border-left', 'solid 1px gray');
				});
			}

			//this clones the last column of notes in each track and deactivates all notes in the new column
			$('.track').each(function(){
				$(this).children('.col').last().clone(true).insertAfter($(this).children('.col').last());
				$(this).children('.col').last().children().removeClass('active');
			});
		}
		
	};

	//call to addMeasure on document load - starts project with one measure loaded
	addMeasure();

	//set the size of all buttons based on the height of the browser window
	var resizeButtons = function(){
		//define button size relative to window height
		buttonSize = $(window).height() / 15;
		
		//set max buttonSize
		if (buttonSize > 90) buttonSize = 90;
			
		//set all buttons outside of tracks using buttonSize
		$('.button').css({
			'height' : buttonSize + 'px',
			'width' : buttonSize + 'px'
		});
		$('.inst_button').css({
			'height' : buttonSize*1.5 + 'px',
			'width' : buttonSize*1.5 + 'px'
		});
		$('#tempo').css({
			'height' : buttonSize*.5 + 'px',
			'width' : buttonSize*1.7 + 'px'
		});
		$('#tempo_button').css({
			'height' : buttonSize + 'px',
			'width': buttonSize*3 + 'px'
		});

		//set tempo-change textbox text size relative to window height
		$('#tempo').css('font', $(window).height() / 30 + 'px bold Verdana, sans-serif');

		resizeTrackButtons();
	};

	//set the size of all track uttons based on the height of current tracks and the browser window
	var resizeTrackButtons = function(){
		//variables for the height of tracks and desired size for buttons within tracks
		var trackHeight = $('.track').height(),
			newButtonSize = trackHeight / 2 - 10;

		//if tracks are shorter than 180px, track buttons will need to be smaller than the other buttons
		if(trackHeight < 180 && newButtonSize < buttonSize) {
			$('.trackbutton').css({
				'height' : newButtonSize +'px',
				'width' : newButtonSize +'px'
			});
		}
		else {
			$('.trackbutton').css({
				'height' : buttonSize +'px',
				'width' : buttonSize +'px'
			});
		}
	};

	//call to set button size on document load
	resizeButtons();

	//load tempo-change text box default text from tempo variable
	$('#tempo').val(tempo);

/*------------------------------------
RESPONSES TO ENVIRONMENT -- NON CLICKS
------------------------------------*/

	//get tempo from textbox when enter key is pressed
	$(document).keypress(function(e) {
	    if(e.which == 13) {
	        $('#tempo_button').trigger('click');
	    }
	});

	//when one track is scrolled, scroll the others too
	$('.track').scroll(function(){
		$('.track').scrollLeft($(this).scrollLeft());
	});

	//call resize function when window size changes
	$(window).resize(function(){
		resizeButtons();
	});


/*-----------------
RESPONSES TO CLICKS
-----------------*/

	//we both know what this does
	$('#addmeasure').click(function(){
		addMeasure();
	});

	//delete 16 columns from each track if more than one measure is loaded
	$('#deletemeasure').click(function(){
		if(measureCount < 2) return true;
		for(var i=0; i< 16; i++){
			$('.track').each(function(){
				$(this).children('.col').last().remove();
			});
		}

		//keep track of new measure count
		measureCount--;
	});

	//remove default text when textbox clicked
	$('#tempo').click(function(){
		$('#tempo').val('');
	});

	//set tempo using value in tempo-change textbox
	$('#tempo_button').click(function(){
		
		//if textbox is empty ignore click
		if($('#tempo').val() == '') return true;

		//try to get an integer
		var temp = parseInt($('#tempo').val());
		
		//on success set tempo
		if(temp) tempo = temp;
		
		//if textbox value is not an integer, reset textbox and run invalid entry animation
		else {
			$('#tempo').css('background-color', '#FF5050');
			setTimeout(function(){ $('#tempo').css('background-color', 'gray'); }, 500);
			$('#tempo').val('');
		}

		//if playback is running, reset the setInterval sequence with the new tempo
		if($('#playstop').hasClass('playing')) {
			clearInterval(playthrough);
			playthrough = setInterval($(this).playCol, 30000/tempo);
		}
	})

	//activate and play note once
	$('.note').click(function(){
		$(this).toggleClass('active');

		//detect track instrument
		parentTrack = $($(this).get(0).parentNode.parentNode);
		if(parentTrack.hasClass('bass')) inst = bass;
		else if(parentTrack.hasClass('violin')) inst = violin;
		else if(parentTrack.hasClass('piano')) inst = piano;
		else if(parentTrack.hasClass('synth')) inst = synth;
		else if(parentTrack.hasClass('drums')) inst = drums;

		//pass note class (C, D, E etc) and octave class (3, 4, 5) to howler .play method
		inst.play(''+$(this).attr('class').split(' ')[0]+''+$(this).attr('class').split(' ')[1]);
	});


	//toggle key signature menu
	$('#keychange').click(function(){
		if($('#key_menu').css('left') == '0px') $('#key_menu').animate({left: '-600px'});
		else $('#key_menu').animate({left: 0});
	});

	//change key signature
	$('.key_choice').click(function(){
		//remove key signature menu
		$('#key_menu').animate({left: '-600px'});

		//get key signature class of chosen div
		var key = $(this).attr('class').split(' ')[1]

		//restore all previously hidden notes
		$('.note').css('display', 'inline-block');
		
		//if key choice was 'none' stop here
		if(key == 'none') return true;

		//otherwise hide notes not in chosen key signature (except for drums)
		$(".note").each(function(){
			parentTrack = $($(this).get(0).parentNode.parentNode);
			if(parentTrack.hasClass('drums')) return true;
			var index = $.inArray($(this).attr('class').split(' ')[0], keys[key]);
			if(index < 0) {
				$(this).removeClass('active');
				$(this).fadeOut('slow');
			}
		});
	});

	//toggle instrument menu
	$('#inst').click(function(){
		$('#inst_menu').animate({left: 0});

		//store selected button and parent track
		$currentTrack = $(this).parent().parent();
		$currentInstButton = $(this);
	});

	//change instrument type
	$('.inst_button').click(function(){
		
		//detect which instrument was selected
		if($(this).hasClass('bass_ico')) {
			//remove classes from parent track, add back scroll and the new instrument class
			$currentTrack.removeClass().addClass('track').addClass('bass');

			//switch background image of the instrument button
			$currentInstButton.css('background-image','url(' + 'img/ico/inst_bass.png' + ')');
		}
		else if($(this).hasClass('violin_ico')) {
			$currentTrack.removeClass().addClass('track').addClass('violin');
			$currentInstButton.css('background-image','url(' + 'img/ico/inst_violin.png' + ')');
		}
		else if($(this).hasClass('piano_ico')) {
			$currentTrack.removeClass().addClass('track').addClass('piano');
			$currentInstButton.css('background-image','url(' + 'img/ico/inst_piano.png' + ')');
		}
		else if($(this).hasClass('synth_ico')) {
			$currentTrack.removeClass().addClass('track').addClass('synth');
			$currentInstButton.css('background-image','url(' + 'img/ico/inst_synth.png' + ')');
		}
		else if($(this).hasClass('drums_ico')) {
			$currentTrack.removeClass().addClass('track').addClass('drums');

			//for drums, display all notes rather than just one key signature
			$currentTrack.children().children('.note').css('display', 'inline-block');
			$currentInstButton.css('background-image','url(' + 'img/ico/inst_drums.png' + ')');
		}

		//remove instrument menu
		$('#inst_menu').animate({left: '-600px'});
	});

	//delete track associated with selected delete button
	$('#deletetrack').click(function(){
		//if there is only one track ignore click
		if($('.track').length < 2) return true;

		//otherwise remove parent track
		$(this).parent().parent().remove();

		//resize all tracks to fit into track container
		var newTrackHeight = 100/$('.track').length - $('.track').length/2;
		$('.track').css('height', newTrackHeight + '%');
		
		//resize track buttons if necessary
		resizeTrackButtons();
	});

	//add new tracks to project
	$('#addtrack').click(function(){
		//if maximum track number already reached ignore click
		if($('.track').length >= maxTracks) return true;

		//otherwise clone bottom track and place beneath the others
		$('.track:last').clone(true).appendTo('.track_container');

		//deactivate all notes in the new track
		$('.track:last').children().children().removeClass('active')

		//resize all tracks to fit into track container
		var newTrackHeight = 100/$('.track').length - $('.track').length/2;
		$('.track').css('height', newTrackHeight + '%');

		//resize track buttons if necessary
		resizeButtons();
	});

	//toggle playback looping
	$('#loop').click(function(){
		//toggle loop flag
		loop = !loop;

		//change button background
		if(loop) {
			$(this).css('background-image','url(' + 'img/loop_on.png' + ')');
		}
		else {
			$(this).css('background-image','url(' + 'img/loop.png' + ')');
		}
	});

	//clear all notes from editor
	$('#clear').click(function(){
		$('.note').removeClass('active');

		//temporarily switch playstop class prior to reinitializing (which will switch them back -- this is hacky)
		$('#playstop').removeClass('stopped');
		$('#playstop').addClass('playing');

		//if loop is on, turn it off
		if(loop) $('#loop').trigger('click');
		
		//reinitialize editor
		$(this).reinitialize();
	});

	//stop/start playback
	$('#playstop').click(function(){
		if($(this).hasClass('playing')) {
			$(this).toggleClass('playing stopped');
			$(this).pauseIt();
		}
		else if ($(this).hasClass('stopped')){
			$(this).toggleClass('playing stopped');
			$(this).playIt();
		}

		//set button background
		$(this).css('background-image','url(' + imageUrl + ')');
	});
	
	//reset playback position and display
	$.fn.reinitialize = function(){
		//remove played-note formatting from all notes
		$('.note').css('opacity',1);

		//if loop flag is on, set position tracker to the first column and carry on with playback
		if(loop) pos = 1;

		//otherwise reset position and trigger the stop button
		else {
			pos = 0;
			$('#playstop').trigger('click');
		}
	};

	//pause playback
	$.fn.pauseIt = function(){
		clearInterval(playthrough);
		imageUrl = 'img/play.png';
	};

	//start playback
	$.fn.playIt = function(){
		//initiate setInterval function usung playCol to play each column of active notes and a bpm-to-millisecond conversion of tempo as the delay
		playthrough = setInterval($(this).playCol, 30000/tempo);
		imageUrl = 'img/stop.png';
	};

	//play back a column of active notes
	$.fn.playCol = function(){
		//keep track of column position in the track
		pos++;

		//calculate total number of columns to play back, accounting for track length
		var colNum = $('.col').length / $('.track').length;
		
		//reinitialize at the end of playback
		if(pos > colNum) {
			$(this).reinitialize();
		}

		//during playback,
		if(pos <= colNum) {
			//iterate over the column specified by pos (pos+1 is used to skip the track_btns div) inside each track
			$('.track :nth-child('+(pos+1)+')').children().each(function(){
				//store the parent track of the note being evaluated
				parentTrack = $($(this).get(0).parentNode.parentNode);

				//if the note in question has been activated,
				if($(this).hasClass('active')) {
					//detect the instrument selected for parent track,
					if(parentTrack.hasClass('bass')) inst = bass;
					else if(parentTrack.hasClass('violin')) inst = violin;
					else if(parentTrack.hasClass('piano')) inst = piano;
					else if(parentTrack.hasClass('synth')) inst = synth;
					else if(parentTrack.hasClass('drums')) inst = drums;

					//and play the note (C, D, E etc) of the octave (2, 3, 4 etc) associated with the note
					inst.play($(this).attr('class').split(' ')[0]+$(this).attr('class').split(' ')[1]);
				}
				//give all notes in the column the 'played' formatting
				$(this).css('opacity', 0.75);
			});
		}
	};
});