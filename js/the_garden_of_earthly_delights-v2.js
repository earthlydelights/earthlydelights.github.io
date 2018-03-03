---
---

var TheGardenOfEarthlyDelights = (function() {

	if (typeof String.prototype.endsWith !== 'function') {
		String.prototype.endsWith = function(suffix) {
			return this.indexOf(suffix, this.length - suffix.length) !== -1;
		};
	}	

	var backend;
	var millisecondsBeforeRetry = 20000;

	var init = function(backendParam) {
		backend = backendParam;
	};

	$(document).ready(function() {

		if (true /*Modernizr.localstorage*/) {
			var earthlyDelightsQuality = localStorage.getItem("earthlyDelightsQuality");
			if (!(typeof earthlyDelightsQuality === "undefined")) {
				$('input[type=range]#quality').val(earthlyDelightsQuality);
			}
		}

		var showSpinner;
		function displayLoadStart() {
			console.log('load starts', moment().format("h:mm:ss a"));
			$('#clock').html('');
			showSpinner = setTimeout(function () {
				$('.fa-spinner').stop().fadeIn(666);
			}, 333);
		}
		function displayLoadFinish() {
			$('.fa-spinner').stop().fadeOut(111);
			clearTimeout(showSpinner);
			$('.fa').removeClass( "hover" );
			console.log('load finished', moment().format("h:mm:ss a"));
		}

		function callImageLoaded($backgroundHolder, retry) {

			console.log("about to call imagesLoaded", moment().format("h:mm:ss a"));
			$backgroundHolder.imagesLoaded( { background: true, debug: false } )

				.progress( function( instance, image ) {
					var result = image.isLoaded ? 'loaded' : 'broken';
					console.log( 'image is ' + result + ' for ' + image.img.src );
					if (!image.isLoaded && !(image.img.src.endsWith("spiral.svg"))) {
						if (retry) {
							var nextTentative = moment().add(millisecondsBeforeRetry, 'milliseconds');
							console.log('all images loaded, at least one is broken, will retry @ ' + nextTentative.format("h:mm:ss a"));
							$('#clock').countdown(nextTentative.toDate(), function(ev) {
								$(this).html(ev.strftime('<p>Trying to reach image server</p><p>Retrying in %S seconds &hellip;</p>'));
							}).on('finish.countdown', function(ev) {
								location.reload();
								// retry($backgroundHolder);
							});
							$('#waitingForBackend').show();
						}
					}
				})
				.fail( function() {
					console.log('all images loaded, at least one is broken');
				})
				.done( function( instance ) {
					console.log('all images successfully loaded');
					$('#waitingForBackend').hide();
				})
				.always( function( instance ) {
					displayLoadFinish();
				})
			;
		}

		// cf. https://developer.mozilla.org/en-US/docs/Web/CSS/background IS YOUR FRIEND !!!!
		{

			function loadFullBackground($backgroundHolder) {
				displayLoadStart();

				$backgroundHolder.css({
					background:
						"url(" + backend +
						"/api/earthly-delights-garden/image/v1/crop" +
						"?width=100000" +
						"&height=100000" +
						"&quality=" + $('input[type=range]#quality').val() +
						") center center / contain no-repeat fixed black",
				});
				callImageLoaded($backgroundHolder, loadFullBackground);
			}

			function loadCroppedBackground($backgroundHolder) {
				displayLoadStart();

				var width	= $backgroundHolder.width();
				var height	= $backgroundHolder.height();

				$backgroundHolder.css({
					background:
						"url(" + backend +
						"/api/earthly-delights-garden/image/v1/crop" +
						"?width=" + width +
						"&height=" + height +
						"&quality=" + $('input[type=range]#quality').val() +
						"&" + (new Date()).getTime() +
						") center center / auto no-repeat fixed black",
				});
				callImageLoaded($backgroundHolder, loadCroppedBackground);
			}
		}

		var loadFullBackgroundThrottled = $.throttle( 666, loadFullBackground);
		var loadCroppedBackgroundThrottled = $.throttle( 666, loadCroppedBackground);

		$( ".fa, input[type=range]" ).hover(
			function() {
				$( ".fa, input[type=range]" ).addClass( "hover" );
			}, function() {
				$( ".fa, input[type=range]" ).removeClass( "hover" );
			}
		);

		var $backgroundHolder = $('body');

		var mc = new Hammer(document.body, {
			recognizers: [
					[Hammer.Tap],
					[Hammer.Press],
					[Hammer.Swipe,{ direction: Hammer.DIRECTION_HORIZONTAL }],
				]
			});

		function loadCroppedBackgroundThrottledOnEvent(ev) {
			if ($('.fa-spinner').is(":visible")) {
				console.log("ignored "+ev+" event, spinner is visible");
				return false;
			}
			ev.preventDefault()
			loadCroppedBackgroundThrottled($backgroundHolder);
		}

		$(window).keypress(function (ev) {
			if (ev.keyCode === 0 || ev.keyCode === 32) {
				loadCroppedBackgroundThrottledOnEvent(ev);
			}
		})
		$('input[type=range]#quality').on("change", function(ev) {

			var earthlyDelightsQuality = $(ev.target).val();
			if (true /* Modernizr.localstorage*/) {
				localStorage.setItem("earthlyDelightsQuality", earthlyDelightsQuality);
			}
			loadCroppedBackgroundThrottledOnEvent(ev);
		});		
		mc.on("swipe", function(ev) {
			loadCroppedBackgroundThrottledOnEvent(ev);
		})
		.on("tap", function(ev) {
			if (!$(ev.target).is('body, .fa-refresh')) {
				console.log("ignored tap event, not on (body or .fa-refresh)");
				return false;
			}
			loadCroppedBackgroundThrottledOnEvent(ev);
		})
		.on("press", function(ev) {
			if (!$(ev.target).is('body')) {
				console.log("ignored tap event, not on body");
				return false;
			}
			if ($('.fa-spinner').is(":visible")) {
				console.log("ignored press event, spinner is visible");
				return false;
			}
			ev.preventDefault()
			loadFullBackgroundThrottled($backgroundHolder);
		});

		loadCroppedBackground($backgroundHolder);

	});

	return {
    	init: init
    }

})();
