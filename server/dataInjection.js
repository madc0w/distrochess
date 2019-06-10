const fens = [
	"rnbqkb1r/pp1p1ppp/8/2pQ4/8/5N2/PPP1PPPP/R1B1KB1R b KQkq - 0 11",
	"r1bqkb1r/pp3ppp/2n1pn2/2pp4/3P4/1P1BPN2/P1P2PPP/RNBQ1RK1 b kq - 0 11",
	"r1bqkbnr/pp1p1ppp/4p3/2p5/2PNP3/2N5/PP1P1PPP/R1BQKB1R b KQkq - 0 9",
	"r1bq1rk1/pp2b1pp/n1p1pn2/5p2/2Pp4/P1NP1NP1/1PQ1PPBP/R1B2RK1 w - - 0 18",
	"r1bqk2r/pppp1ppp/2n5/4p3/1bB1n3/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 1 12",
	"r1bqk2r/ppp2ppp/2n5/2b1p3/8/2P2NP1/P2PPPBP/R1BQK2R w KQkq - 3 14",
	"rnbqk2r/pp3ppp/2pb1n2/3p2B1/3P4/2N2N2/PPP2PPP/R2QKB1R w KQkq - 0 12",
	"rnbq1rk1/pppp1ppp/5n2/4B3/1bP5/5N2/P2PPPPP/RN1QKB1R b KQ - 2 9",
	"r1bqk2r/pp1pppbp/2n3p1/1Bp1P3/6n1/2N2N2/PPPP1PPP/R1BQ1RK1 w kq - 1 12",
	"r2q1rk1/ppp1bppp/2np1n2/8/2B1P1b1/2N1QN2/PPP2PPP/R1B2RK1 w - - 7 16",
	"r2qk2r/1pp2ppp/p1pb1n2/8/4P3/3P1b1P/PPP2PP1/RNBQK2R w KQkq - 0 16",
	"r1bqkb1r/1p3ppp/p1n2n2/2pp4/3P4/2NBPN2/PP3PPP/R1BQK2R w KQkq - 2 14",
	"r1bq1rk1/pp2bppp/2n2n2/2p1p3/2P3P1/P3P2P/1B1P1P2/RN1QKBNR w KQ - 2 16",
	"rnbqk2r/1pp1bppp/p3pn2/3p2B1/3PP3/2N2N2/PPP2PPP/R2QKB1R w KQkq - 4 10",
	"rn1qkbnr/ppp2ppp/4p3/3p1b2/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 6",
	"rnbqkb1r/1p1n1ppp/p3p3/1BppP3/3P4/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 14",
	"rnbqkbnr/pp2pppp/8/2pp4/3P4/2P5/PP2PPPP/RNBQKBNR b KQkq - 0 7",
	"r1bqk2r/pppp1ppp/2n2n2/2bNp3/2P5/5NP1/PP1PPPBP/R1BQK2R b KQkq - 5 11",
];

const playerNames = [
	"d00d18",
	"MisterMe",
	"chess_head",
	"megamind",
	"Augustin Harford",
	"Webster Davison",
	"Rosaleen Marsden",
	"Isay Bennet",
	"Maurice Sims",
	"Luella Láník",
	"Wystan Balogh",
	"Gábor Derrick",
	"Cletis Soucy",
	"Viola Beringer",
	"Eileen Desroches",
	"Raynard Fülöp",
	"Jason Noyer",
	"Oswin Sergeant",
	"Dagmar Ayers",
	"Brigit O'Dell"
];

Meteor.methods({
	clearSeedData : function(pw) {
		if (pw == "blimey") {
			Games.remove({
				isSeed : true
			});

			Meteor.users.remove({
				isSeed : true
			});
		} else {
			console.warn("somebody tried to call seedData with bad password", pw);
		}
	},


	seedData : function(pw) {
		if (pw == "blimey") {
			const now = new Date();

			const whitePlayers = [];
			const blackPlayers = [];
			for (var name of playerNames) {
				console.log("name", name);
				var user = Meteor.users.findOne({
					username : name
				});
				if (!user) {
					user = {
						isSeed : true,
						isWhite : Math.random() < 0.5,
						username : name,
						createdAt : now,
						rating : 1160 + Math.random() * 80,
						emails : [
							{
								address : name.replace(" ", "_") + "@gmail.com",
								verified : false,
							}
						]
					};
					user._id = Meteor.users.insert(user);
					console.log("created seed user", user);
				}
				if (user.isWhite) {
					whitePlayers.push(user);
				} else {
					blackPlayers.push(user);
				} //
			}

			const regex = / (\d+)$/;
			for (var fen of fens) {
				const gameIdRecord = SystemData.findOne({
					key : "GAME_ID"
				});
				const currGameId = gameIdRecord.data + 1;
				SystemData.update({
					_id : gameIdRecord._id
				}, {
					$set : {
						data : currGameId
					}
				});

				const match = regex.exec(fen);
				const numMoves = parseInt(match);
				const history = [];
				const moves = [];
				const gamePlayers = {};
				const moveTime = new Date();
				const dTime = 20 * Math.random() + 10;
				moveTime.setDate(moveTime.getDate() - dTime);
				for (var i = 0; i < numMoves; i++) {
					history.push({
						position : "",
						pieces : ""
					});
					moves.push({});

					const isWhite = i % 2 == 0;
					const players = isWhite ? whitePlayers : blackPlayers;
					console.log("players", players);
					const player = players[Math.floor(players.length * Math.random())];
					if (!gamePlayers[player._id]) {
						gamePlayers[player._id] = {
							isWhite : isWhite,
							moves : [],
						};
					}

					gamePlayers[player._id].lastMoveTime = new Date(moveTime);
					gamePlayers[player._id].moves.push({});
					moveTime.setHours(moveTime.getHours() + (dTime * 24 / numMoves));
				}

				const game = {
					isSeed : true,
					id : currGameId,
					history : history,
					moves : moves,
					gameResult : null,
					currentUserId : null,
					players : gamePlayers,
					position : fen,
					creationDate : now,
					lastMoveTime : now,
				};
				Games.insert(game); //
			}
		} else {
			console.warn("somebody tried to call seedData with bad password", pw);
		}
	},
});
