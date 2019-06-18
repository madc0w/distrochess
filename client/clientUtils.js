const momentUpdate = new ReactiveVar();

Meteor.setInterval(() => {
	momentUpdate.set(new Date());
}, 30 * 1000);

clientUtils = {
	isSmallScreen : function() {
		return innerWidth < 480;
	},

	moment : function(date) {
		momentUpdate.get();
		var language = TAPi18n.getLanguage();
		if (!Object.keys(languages).includes(language)) {
			language = "en";
		}
		return moment(date).locale(language);
	},
}
