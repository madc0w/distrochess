const game = new ReactiveVar(null);
var moveNum = new ReactiveVar(0);
var board = null;

Template.history.helpers({
	isWhite : function() {
		return this.players[Meteor.userId()].isWhite;
	},

	numPlayers : function(isWhite) {
		var count = 0;
		for (var userId in game.get().players) {
			if (game.get().players[userId].isWhite == isWhite) {
				count++;
			}
		}
		return count;
	},

	numMoves : function() {
		return game.get().moves.length;
	},

	moveUsername : function() {
		if (moveNum.get() > 0) {
			const user = Meteor.users.findOne({
				_id : game.get().history[moveNum.get() - 1].userId
			});
			return user ? utils.getUsername(user) : null;
		}
		return null;
	},

	currentMove : function() {
		return moveNum.get();
	},

	games : function() {
		if (Meteor.user()) {
			return Games.find({
				_id : {
					$in : Meteor.user().gameIds || []
				}
			}, {
				sort : {
					lastMoveTime : -1
				},
			});
		}
		return null;
	},

	game : function() {
		return game.get();
	},

	formatDateTime : function(date) {
		return utils.moment(date).fromNow();
	},

	formatInt : function(i) {
		return i ? Math.round(i) : "-";
	},

	gameResult : function(_game) {
		return _game.result ? _game.result.toLowerCase() : "ongoing";
	},
});

Template.history.events({
	"click .select-game-button " : function(e) {
		Router.go("/history?id=" + this.id);
	},

	"click #first-move" : function(e) {
		moveNum.set(0);
		setBoard();
	},

	"click #last-move" : function(e) {
		moveNum.set(game.get().moves.length);
		setBoard();
	},

	"click #prev-move" : function(e) {
		if (moveNum.get() > 0) {
			moveNum.set(moveNum.get() - 1);
			setBoard();
		}
	},

	"click #next-move" : function(e) {
		if (moveNum.get() < game.get().moves.length) {
			moveNum.set(moveNum.get() + 1);
			setBoard();
		}
	},

	"click #export-pgn-button" : function(e) {
		const chess = new Chess();
		const _game = game.get();
		for (var i in _game.moves) {
			chess.move(_game.moves[i]);
		}
		const pgn = chess.pgn();
		if (pgn) {
			console.log(pgn);

			// stolen from https://stackoverflow.com/questions/8310657/how-to-create-a-dynamic-file-link-for-download-in-javascript
			const blob = new Blob([ pgn + "\n" ], {
				type : "text/plain"
			});

			const dlink = document.createElement("a");
			dlink.download = "distrochess-game-" + _game.id + ".pgn";
			dlink.href = window.URL.createObjectURL(blob);
			dlink.onclick = function(e) {
				// revokeObjectURL needs a delay to work properly
				const that = this;
				Meteor.setTimeout(function() {
					window.URL.revokeObjectURL(that.href);
				}, 1500);
			};

			dlink.click();
			dlink.remove();
		} else {
			message.set(TAPi18n.__("pgn_fail"));
		}
	},
});


Template.history.onCreated(function() {
	Meteor.subscribe("userGames");
	game.set(null);

	this.autorun(() => {
		const gameId = historyGameId.get();
		if (gameId) {
			const _game = Games.findOne({
				id : gameId
			});
			if (_game) {
				Meteor.subscribe("usernames", Object.keys(_game.players));

				game.set(_game);
				board = new ChessBoard("history-chess-board", {
					draggable : false,
				});
				board.start();
			}
		}
	});
});

///////////////////////////////////////////////////////////////////////////////////////////////////

function setBoard() {
	var pos = null;
	if (moveNum.get() > 0) {
		do {
			pos = game.get().history[moveNum.get() - 1].fen;
			if (!pos) {
				moveNum.set(moveNum.get() + 1);
			}
		} while (!pos && moveNum.get() < game.get().history.length);
		if (pos) {
			board.position(pos);
		}
	} else {
		board.start();
	}
}
