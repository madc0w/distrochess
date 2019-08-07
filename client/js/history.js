const game = new ReactiveVar(null);
const isLoadingComments = new ReactiveVar(false);
const moveNum = new ReactiveVar(0);
var board = null;
var didInit = false;

Template.history.helpers({
	userColor: function (userId) {
		const _game = game.get();
		if (_game && _game.players[userId]) {
			return _game.players[userId].isWhite ? "w" : "b";
		}
		return null;
	},

	commentUsername: function (comment) {
		const user = Meteor.users.findOne({
			_id: comment.userId
		});
		return user ? utils.getUsername(user) : "?";
	},

	comments: function () {
		const comments = [];
		const _game = game.get();
		if (_game) {
			Comments.find({
				gameId: _game._id
			}, {
					sort: {
						date: 1
					}
				}).forEach(function (comment) {
					// if game is ongoing, show only comments for the current users's own side
					if (comment.userId == Meteor.userId() || _game.gameResult ||
						(_game.players[Meteor.userId()] && _game.players[Meteor.userId()].isWhite == _game.players[comment.userId].isWhite)) {
						comments.push(comment);
					}
				});
		}
		return comments;
	},

	isLoadingComments: function () {
		return isLoadingComments.get();
	},

	pgnData: function () {
		const chess = new Chess();
		const _game = game.get();
		for (var i in _game.moves) {
			chess.move(_game.moves[i]);
		}
		const pgn = chess.pgn();
		//		console.log(pgn);
		return encodeURIComponent(pgn);
	},

	pgnFilename: function () {
		return "distrochess-game-" + game.get().id + ".pgn";
	},

	gamePlayer: function () {
		return game.get().players[Meteor.userId()];
	},

	isWhite: function (_game) {
		return _game.players && _game.players[Meteor.userId()].isWhite;
	},

	numPlayers: function (isWhite) {
		var count = 0;
		for (var userId in game.get().players) {
			if (game.get().players[userId].isWhite == isWhite) {
				count++;
			}
		}
		return count;
	},

	numMoves: function () {
		return game.get().moves.length;
	},

	moveUsername: function () {
		if (moveNum.get() > 0) {
			const user = Meteor.users.findOne({
				_id: game.get().history[moveNum.get() - 1].userId
			});
			return user ? utils.getUsername(user) : null;
		}
		return null;
	},

	currentMove: function () {
		return moveNum.get();
	},

	games: function () {
		if (Meteor.user()) {
			return Games.find({
				_id: {
					$in: Meteor.user().gameIds || []
				}
			}, {
					sort: {
						lastMoveTime: -1
					},
				});
		}
		return null;
	},

	game: function () {
		return game.get();
	},

	formatDateTime: function (date) {
		return clientUtils.fromNow(date);
	},

	formatInt: function (i) {
		return i ? Math.round(i) : "-";
	},

	gameResult: function (_game) {
		_game = _game || game.get();
		return _game.gameResult ? _game.gameResult.toLowerCase() : "ongoing";
	},
});

Template.history.events({
	"click #show-comments-button": function (e) {
		dialog.set("game-comments-container-dialog");
	},

	"click #show-players-button": function (e) {
		dialog.set("players-dialog");
	},

	"click .history-comment-move-num": function (e) {
		if (clientUtils.isMobile()) {
			dialog.set(null);
		}
		moveNum.set(this.moveNum);
		setBoard();
	},

	"click .select-game-button": function (e) {
		didInit = false;
		moveNum.set(0);
		Router.go("/history?id=" + this.id);
	},

	"click #first-move": function (e) {
		moveNum.set(0);
		setBoard();
	},

	"click #last-move": function (e) {
		moveNum.set(game.get().moves.length);
		setBoard();
	},

	"click #prev-move": prevMove,

	"click #next-move": nextMove,

	"click #export-pgn-button": function (e) {
		const _game = game.get();
		if (Meteor.isCordova) {
			message.set(TAPi18n.__("download_pgn_in_webapp", {
				gameId: _game.id
			}));
		} else {
			const chess = new Chess();
			for (var i in _game.moves) {
				chess.move(_game.moves[i]);
			}
			const pgn = chess.pgn();
			if (!pgn) {
				message.set(TAPi18n.__("pgn_fail"));
			}
		}
	},
});

Template.history.onCreated(function () {
	document.addEventListener("keyup", arrowListener);

	didInit = false;
	isSpinner.set(true);
	Meteor.subscribe("userGames", function () {
		isSpinner.set(false);
	});
	game.set(null);

	isLoadingComments.set(true);
	this.autorun(() => {
		const gameId = historyGameId.get();
		if (gameId) {
			Meteor.subscribe("game", gameId);
		}
	});
});

Template.history.onDestroyed(function () {
	document.removeEventListener("keyup", arrowListener);
});

Template.history.onRendered(function () {
	this.autorun(() => {
		const gameId = historyGameId.get();
		if (gameId) {
			const _game = Games.findOne({
				id: gameId
			});
			if (_game && !didInit) {
				didInit = true;
				Meteor.subscribe("usernames", Object.keys(_game.players));

				game.set(_game);
				board = new ChessBoard("history-chess-board", {
					draggable: false,
				});

				if (clientUtils.isMobile()) {
					const width = innerWidth - 12;
					$(".chess-board").css("width", width);
					board.resize();
				}

				board.start();

				Meteor.subscribe("comments", _game._id, function () {
					isLoadingComments.set(false);
				});
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

function arrowListener(e) {
	if (e.key == "ArrowRight") {
		nextMove();
	} else if (e.key == "ArrowLeft") {
		prevMove();
	}
}


function prevMove() {
	if (moveNum.get() > 0) {
		moveNum.set(moveNum.get() - 1);
		setBoard();
	}
}

function nextMove() {
	if (moveNum.get() < game.get().moves.length) {
		moveNum.set(moveNum.get() + 1);
		setBoard();
	}
}
