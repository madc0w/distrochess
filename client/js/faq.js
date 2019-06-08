const entries = [];

Template.faq.helpers({
	entries : function() {
		if (entries.length == 0) {
			var i = 0;
			var isStop = false;
			do {
				i++;
				const question = TAPi18n.__("faq_q" + i);
				isStop = question == "faq_q" + i;
				if (!isStop) {
					const answer = TAPi18n.__("faq_a" + i);
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
