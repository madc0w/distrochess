Template.faq.helpers({
	entries : function() {
		const entries = [];
		const values = {
			flagTime : FLAG_TIME_HOURS,
			initialRating : INITIAL_RATING,
		};

		for (var i = 1; translations.project["faq_q" + i]; i++) {
			const question = TAPi18n.__("faq_q" + i);
			const answer = TAPi18n.__("faq_a" + i, values);
			entries.push({
				question : question,
				answer : answer
			});
		}
		return entries;
	},
});
