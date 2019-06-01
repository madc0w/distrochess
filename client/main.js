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
			if (move.piece == "p" && ((board.whiteToMove && to.endsWith("8")) || (!board.whiteToMove && to.endsWith("1")))) {
				isOverlay.set(true);
				isPromotion.set(true);
			}

		}
	}

	const cfg = {
		draggable : true,
		dropOffBoard : "snapback", // this is the default
		onDrop : onDrop
	};

	board = new ChessBoard("chess-board", cfg);
	const position = getPosition();
	board.position(position);
	//	if (!board.whiteToMove) {
	//		board.flip();
	//	}
	//	console.log("board", board);

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

function getPosition() {
	Games.find();
	const game = null;

	if (!game) {
		board.start();
		return board.position();
	}

	const position = {
		h2 : "bP",
		a1 : "bN"
	};
	return position;

}
