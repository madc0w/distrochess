const entries = [];

Template.faq.helpers({
	entries : function() {
		if (entries.length == 0) {
			const values = {
				flagTime : FLAG_TIME_DAYS
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
		}
		return entries;
	},
});
