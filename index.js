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

	this.max = {
		x: width,
		y: height
	};

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
		x: Math.round(this.options.focus.x * (this.max.x / 100)),
		y: Math.round(this.options.focus.y * (this.max.y / 100))
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
	var self = this;
	var dragging, pointer;

	var setPointer = function(e){
		var newPos = {
			x: Math.round(clamp(self.pointPos.x + (e.pageX - pointer.x), 0, self.max.x)),
			y: Math.round(clamp(self.pointPos.y + (e.pageY - pointer.y), 0, self.max.y))
		};
		self.point.style.transform = 'translate3d(' + newPos.x + 'px, ' + newPos.y + 'px, 0)';
		return newPos;
	};

	var mousemove = function(e){
		var point = setPointer(e);
		self._adjustPreview(point);
	};

	var mouseup = function(e){
		e.preventDefault();
		e.stopPropagation();
		self.emit('dragend');

		self.pointPos = setPointer(e);
		self.emit('change', (100 / self.max.x) * self.pointPos.x, (100 / self.max.y) * self.pointPos.y);

		document.body.removeEventListener('mousemove', mousemove);
		document.body.removeEventListener('mouseup', mouseup);
	};

	this.point.addEventListener('mousedown', function(e){
		e.stopPropagation();
		e.preventDefault();
		self.emit('dragstart');

		dragging = true;
		pointer = { x: e.pageX, y: e.pageY };

		document.body.addEventListener('mousemove', mousemove);
		document.body.addEventListener('mouseup', mouseup);
	});
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
	if (width < this.max.x && height < this.max.y){
		ratio = this.max.x / width;
		width *= ratio;
		height *= ratio;
	}
	if (width > this.max.x){
		ratio = this.max.x / width;
		width *= ratio;
		height *= ratio;
	}
	if (height > this.max.y){
		ratio = this.max.y / height;
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
	if ((x + width) > this.max.x){
		x = this.max.x - width;
	}

	if (y < 0){
		y = 0;
	}
	if ((y + height) > this.max.y){
		y = this.max.y - height;
	}

	this.preview.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';

	var isLandscape = width === this.max.x;
	if (isLandscape){
		this.overlay1.style.transform = 'translate3d(0, ' + (y - this.max.y) + 'px, 0)';
		this.overlay2.style.transform = 'translate3d(0, ' + (y + height) + 'px, 0)';
	} else{
		this.overlay1.style.transform = 'translate3d(' + (x - this.max.x) + 'px, 0, 0)';
		this.overlay2.style.transform = 'translate3d(' + (x + width) + 'px, 0, 0)';
	}

};

module.exports = Focal;
