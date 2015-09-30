'use strict';

var clamp = require('mout/math/clamp');
var deepFillIn = require('mout/object/deepFillIn');
var mixIn = require('mout/object/mixIn');

/**
 * Focal
 *
 * @param {Element} img
 * @param {Object} options
 * @param {Object} options.focus
 * @param {Number} options.focus.x - Percentage, between 0 and 100
 * @param {Number} options.focus.y - Percentage, between 0 and 100
 */
var Focal = function(img, options){
	this.img = img;
	this.options = deepFillIn(options || {}, Focal.defaults);
	this.currentCoords = {
		x: this.options.focus.x,
		y: this.options.focus.y
	};

	this.bound = {
		dragstart: this._dragstart.bind(this),
		drag: this._drag.bind(this),
		dragend: this._dragend.bind(this)
	};

	this._build();
};

require('util').inherits(Focal, require('events').EventEmitter);

/**
 * Default options
 */
Focal.defaults = {
	focus: {
		x: 50,
		y: 50
	}
};

/**
 * Build elements and replace image in the dom
 */
Focal.prototype._build = function(){
	var rect = this.img.getBoundingClientRect();
	var width = rect.right - rect.left;
	var height = rect.bottom - rect.top;

	this.maxWidth = width;
	this.maxHeight = height;

	var wrap = document.createElement('div');
	wrap.classList.add('focal');
	wrap.style.width = width + 'px';
	wrap.style.height = height + 'px';
	wrap.style.backgroundImage = 'url(' + this.img.src + ')';
	wrap.style.backgroundSize = 'cover';
	this.wrap = wrap;

	var preview = document.createElement('div');
	preview.classList.add('focal__preview');
	wrap.appendChild(preview);
	this.preview = preview;

	var overlay1 = document.createElement('div');
	overlay1.classList.add('focal__overlay');
	wrap.appendChild(overlay1);
	this.overlay1 = overlay1;

	var overlay2 = document.createElement('div');
	overlay2.classList.add('focal__overlay');
	wrap.appendChild(overlay2);
	this.overlay2 = overlay2;

	var pointPos = this.pointPos = {
		x: Math.round(this.options.focus.x * (this.maxWidth / 100)),
		y: Math.round(this.options.focus.y * (this.maxHeight / 100))
	};

	var point = document.createElement('div');
	point.classList.add('focal__focus');
	point.style.transform = 'translate3d(' + pointPos.x + 'px, ' + pointPos.y + 'px, 0)';
	wrap.appendChild(point);
	this.point = point;

	this.img.parentNode.replaceChild(wrap, this.img);
	wrap.getBoundingClientRect();
	wrap.classList.add('is-loaded');

	this._setEvents();
};

/**
 * Set events to drag the point around
 */
Focal.prototype._setEvents = function(){
	this.point.addEventListener('mousedown', this.bound.dragstart);
};

/**
 * Handle events that cause drag to start
 *
 * @param {Event} e
 */
Focal.prototype._dragstart = function(e){
	e.stopPropagation();
	e.preventDefault();

	this.startCoords = { x: e.pageX, y: e.pageY };
	this.wrap.classList.add('focal--dragging');

	document.body.addEventListener('mousemove', this.bound.drag);
	document.body.addEventListener('mouseup', this.bound.dragend);

	this.emit('dragstart');
};

/**
 * Handle events that cause drag
 *
 * @param {Event} e
 */
Focal.prototype._drag = function(e){
	var pos = this._calculatePos(e.pageX - this.startCoords.x, e.pageY - this.startCoords.y);
	this._setPos(pos.x, pos.y);
	this._adjustPreview(pos);

	this.emit('drag');
};

/**
 * Handle events that cause drag to end
 *
 * @param {Event} e
 */
Focal.prototype._dragend = function(e){
	e.preventDefault();
	e.stopPropagation();

	this.wrap.classList.remove('focal--dragging');

	var pos = this._calculatePos(e.pageX - this.startCoords.x, e.pageY - this.startCoords.y);
	this._setPos(pos.x, pos.y);
	this._adjustPreview(pos);
	this.pointPos = pos;

	var coords = this._posToCoords(pos.x, pos.y);
	if (coords.x !== this.currentCoords.x || coords.y !== this.currentCoords.y){
		this.currentCoords = coords;
		this.emit('change', coords.x, coords.y);
	}

	document.body.removeEventListener('mousemove', this.bound.drag);
	document.body.removeEventListener('mouseup', this.bound.dragend);

	this.emit('dragend');
};

/**
 * Convert pixel-based position to percent-based coords
 *
 * @param {Number} x
 * @param {Number} y
 *
 * @return {Object}
 */
Focal.prototype._posToCoords = function(x, y){
	return {
		x: (100 / this.maxWidth) * x,
		y: (100 / this.maxHeight) * y
	};
};

/**
 * Calculate focus position based on given delta
 *
 * @return {Object}
 */
Focal.prototype._calculatePos = function(dX, dY){
	return {
		x: Math.round(clamp(this.pointPos.x + dX, 0, this.maxWidth)),
		y: Math.round(clamp(this.pointPos.y + dY, 0, this.maxHeight))
	};
};

/**
 * Set focus position
 *
 * @param {Number} x
 * @param {Numver} y
 */
Focal.prototype._setPos = function(x, y){
	this.point.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
};

/**
 * Set preview to given size
 *
 * If a falsy value is passed will remove current preview
 *
 * @param {Number} width
 * @param {Number} height
 */
Focal.prototype.setPreview = function(width, height){
	width = parseInt(width, 10);
	height = parseInt(height, 10);

	if (!width || !height || isNaN(width || isNaN(height))){
		this.wrap.classList.remove('focal--has-preview');
		return;
	}

	this.wrap.classList.add('focal--has-preview');

	var ratio;
	if (width < this.maxWidth && height < this.maxHeight){
		ratio = this.maxWidth / width;
		width *= ratio;
		height *= ratio;
	}
	if (width > this.maxWidth){
		ratio = this.maxWidth / width;
		width *= ratio;
		height *= ratio;
	}
	if (height > this.maxHeight){
		ratio = this.maxHeight / height;
		width *= ratio;
		height *= ratio;
	}

	width = Math.round(width);
	height = Math.round(height);
	this.preview.style.width = width + 'px';
	this.preview.style.height = height + 'px';

	this.previewWidth = width;
	this.previewHeight = height;

	this._adjustPreview(this.pointPos);
};

/**
 * Adjust preview positioning
 */
Focal.prototype._adjustPreview = function(focus){
	var width = this.previewWidth;
	var height = this.previewHeight;
	var x = focus.x - (width / 2);
	var y = focus.y - (height / 2);

	if (x < 0){
		x = 0;
	}
	if ((x + width) > this.maxWidth){
		x = this.maxWidth - width;
	}

	if (y < 0){
		y = 0;
	}
	if ((y + height) > this.maxHeight){
		y = this.maxHeight - height;
	}

	this.preview.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';

	var isLandscape = width === this.maxWidth;
	if (isLandscape){
		this.overlay1.style.transform = 'translate3d(0, ' + (y - this.maxHeight) + 'px, 0)';
		this.overlay2.style.transform = 'translate3d(0, ' + (y + height) + 'px, 0)';
	} else{
		this.overlay1.style.transform = 'translate3d(' + (x - this.maxWidth) + 'px, 0, 0)';
		this.overlay2.style.transform = 'translate3d(' + (x + width) + 'px, 0, 0)';
	}

};

module.exports = Focal;
