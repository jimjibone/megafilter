// TODO: switch to requireJS or AMD modules
// TODO: convert to backbone?

$(function(){
	mf.init()
	mf.load()
})

var mf = {}

mf.init = function() {
	// put in constructor
	mf.nav.skip    = new mf.controllers.button('#skip')
	mf.nav.discard = new mf.controllers.button('#discard')
	mf.nav.publish = new mf.controllers.button('#publish')
	mf.nav.inspect = new mf.controllers.button('#inspect')
	mf.nav.undo    = new mf.controllers.button('#undo')

	mf.nav.skip.bind('right').bind('j').bind('s')
	mf.nav.discard.bind('x').bind('d').bind('space')
	mf.nav.publish.bind('w').bind('p')
	mf.nav.inspect.bind('i')
	mf.nav.undo.bind('u').bind('ctrl+z')
	mf.nav.undo.disable()

	mf.display = new mf.controllers.display('article')
	mf.display.wait()

	mf.pending = new mf.controllers.counter('#pending')
	// queue refill should load article
	mf.pending.change(function(from, to){
		if (from == 0 && to > 0)
			mf.load()

		document.title =  '('+to+') Megafilter'
		console.log('change to',to,'from',from)
	})

	mf.nav.skip.action(mf.skip)
	mf.nav.discard.action(mf.discard)
	mf.nav.publish.action(mf.publish)
	mf.nav.inspect.action(mf.inspect)
	//mf.nav.undo.action(mf.undo)

	setInterval(mf.check_pending,5000)
}

// render the next article from cache and begin to use the
mf.next = function() {}

mf.controllers = {}

mf.controllers.display = function(selector) {
	var ele = $(selector)

	// currently displayed article, if any
	this.article = null

	// render a given node-feedparser article to the page
	this.render = function(article) {
		this.article = article
		$('#error').hide()
		$('#loading').hide()
		ele.css('visibility','visible')
		$('section.description',ele).html(article.description)
		$('> h1 a',ele).html(article.title).attr('href',article.origlink)
		$('time',ele).attr('datetime',article.pubdate)
		$('.note',ele).html(article.author).prepend(' by ')
		return this
	}

	var discard = this.discard = function() {
		this.article = null
		ele.css('visibility','hidden')
		return this
	}

	// show loading animation
	this.wait = function(){
		$('#loading').show()
		discard()
		$('#error').hide()
		return this
	}

	// show 'error' message
	this.error = function(msg) {
		$('#loading').hide()
		discard()
		$('#error').show().text(msg)
		return this
	}
}

// positive article counter
mf.controllers.counter = function(selector) {
	ele = $(selector)
	// count
	var value = null

	// callback for when number changes
	var change = function(from,to) {}
	this.change = function(fn) {
		change = fn
	}

	this.set = function(number) {
		if (number == value) return;
		// from, to
		change(value,number)
		ele.text(number)
		value = number
		return this
	}

	// initialise to zero without triggering change()
	ele.text(value)

	this.get = function() {
		return value
	}

	this.decrement = function() {
		if (value > 0) {
			ele.text(--value)
			change(value+1,value)
		}

		return this
	}
}

// navigation buttons (sort of like a view controller)
mf.controllers.button = function(selector){
	var ele = $(selector)
	var enabled = true;

	// callback for when button is clicked or key is pressed
	var action = function() {}
	this.action = function(fn) {
		action = fn
	}

	ele.click(function() {
		if (enabled)
			action()
	})

	this.enable = function() {
		enabled = true
		ele.removeClass('disabled')
		return this
	}

	this.disable = function() {
		enabled = false
		ele.addClass('disabled')
		return this
	}

	// bind a key
	this.bind = function(key) {

		// press
		$(document).bind('keydown',key,function() {
			if (!enabled) return false

			ele.addClass('depressed')
			return false
		})
		// release
		$(document).bind('keyup',key,function() {
			if (!enabled) return false

			ele.removeClass('depressed')
			action()
			return false
		})
		return this
	}
}

// -------model?

// download and display the next article (or current on first load)
mf.load = mf.skip = function() {
	mf.display.wait()
	mf.nav.disable()
	$.ajax({
		url: mf.display.article?'/next':'/current',
		type:'GET',
		error:function() {
			mf.display.error('No more articles')
		},
		success:function(article) {
			if (!article.pending) {
				mf.display.error('None left in queue')
				ml.article = null
			} else {
				mf.display.render(article)
				mf.nav.enable()
			}

			mf.pending.set(article.pending)
		}


	})
}

mf.publish = function() {
	mf.pending.decrement()
	$.ajax({
		url:'/publish/'+mf.display.article.id,
		type:'GET',
		error:function() {
			mf.display.error("None left!")
		},
		success:function() {
			console.log('Published article')
		}

	})
	mf.load()
}

mf.discard = function() {
	mf.pending.decrement()
	$.ajax({
		url:'/'+mf.display.article.id,
		type:'DELETE',
		error:function() {
			mf.display.error("That's it!")
		},
		success:function() {
			console.log('Deleted article')
		}

	})
	mf.load()
}

mf.inspect = function() {
	window.open(mf.display.article.link)
}

mf.nav = {}
mf.nav.enable = function() {
	mf.nav.skip.enable()
	mf.nav.discard.enable()
	mf.nav.publish.enable()
	mf.nav.inspect.enable()
}

mf.nav.disable = function() {
	mf.nav.skip.disable()
	mf.nav.discard.disable()
	mf.nav.publish.disable()
	mf.nav.inspect.disable()
}

mf.check_pending = function () {
	$.ajax({
		url: '/pending',
		type: 'GET',
		success: function(d) {
			mf.pending.set(d.pending)
		}
	})
}
