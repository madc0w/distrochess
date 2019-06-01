import { Template } from "meteor/templating";
import { ReactiveVar } from "meteor/reactive-var";

import "./main.html";

Template.main.onRendered(() => {
	console.log("main rendered");

	const position = {
		a8 : 'bR',
		c8 : 'bB',
		g8 : 'bK',
		g7 : 'bP',
		a6 : 'wP',
		c6 : 'bN',
		e6 : 'bP',
		f6 : 'bR',
		h6 : 'bP',
		a5 : 'bQ',
		c5 : 'bP',
		b4 : 'bB',
		d4 : 'wP',
		c3 : 'wN',
		f3 : 'wN',
		a2 : 'wP',
		b2 : 'wP',
		d2 : 'wQ',
		e2 : 'wB',
		f2 : 'wP',
		g2 : 'wP',
		h2 : 'wP',
		a1 : 'wR',
		e1 : 'wK',
		h1 : 'wR'
	};

	const cfg = {
		draggable : true,
		dropOffBoard : "snapback", // this is the default
		position : position,
	//		onDrop : onDrop
	};

	const board = new ChessBoard("chess-board", cfg);
	//	if (!board.whiteToMove) {
	//		board.flip();
	//	}

});
