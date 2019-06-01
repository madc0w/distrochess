import { Template } from "meteor/templating";
import { ReactiveVar } from "meteor/reactive-var";

import "./main.html";

var boad = null;
const isPromotion = new ReactiveVar(false);
const isOverlay = new ReactiveVar(false);

Template.main.helpers({
	isPromotion : function() {
		return isPromotion.get();
	},

	isOverlay : function() {
		return isOverlay.get();
	},

	playingColor : playingColor,
});

Template.main.onRendered(() => {
	console.log("main rendered");

	const position = {
		h2 : "bP",
		a1 : "bN"
	};

	function onDrop(from, to) {
		if (to != "offboard") {
			const game = new Chess(board.fen() + " " + playingColor() + " - - 0 1");

			const move = game.move({
				from : from,
				to : to,
				promotion : "q" // always promote to queen
			});

			// illegal move
			if (move === null) {
				return "snapback";
			}

			board.lastMove = move;
			if (move.piece == "p" && ((board.whiteToMove && to.startsWith("a")) || (!board.whiteToMove && to.startsWith("h")))) {
				isOverlay.set(true);
				isPromotion.set(true);
			}

		}
	}

	const cfg = {
		draggable : true,
		dropOffBoard : "snapback", // this is the default
		position : position,
		onDrop : onDrop
	};

	board = new ChessBoard("chess-board", cfg);
	//	if (!board.whiteToMove) {
	//		board.flip();
	//	}
	console.log("board", board);

});


Template.promotionPiece.helpers({
	playingColor : playingColor,
});

Template.promotionPiece.events({
	"click img" : function(e) {
		const position = board.position();
		position[board.lastMove.to] = playingColor() + this.piece;
		board.position(position);
		isPromotion.set(false);
		isOverlay.set(false);
	},
});

///////////////////////////////////////////////////////////////////////////////////////////////////


function playingColor() {
	return board.whiteToMove ? "w" : "b";
}
