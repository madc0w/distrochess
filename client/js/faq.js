Template.faq.helpers({
	entries : function() {
		const entries = [];
		const values = {
			flagTime : FLAG_TIME_HOURS,
			initialRating : INITIAL_RATING,
			githubLink : clientUtils.makeAndroidLink("https://github.com/madc0w/distrochess"),
			eloAlgorithmLink : clientUtils.makeAndroidLink("https://www.geeksforgeeks.org/elo-rating-algorithm/"),
		};

		var i = 0;
		var isStop = false;
		do {
			i++;
			const question = TAPi18n.__("faq_q" + i);
			isStop = question == "faq_q" + i;
			if (!isStop) {
				const answer = TAPi18n.__("faq_a" + i, values);
				entries.push({
					question : question,
					answer : answer
				});
			}
		} while (!isStop);
		return entries;
	},
});
