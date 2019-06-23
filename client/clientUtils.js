const momentUpdate = new ReactiveVar();
const toastDuration = 4000;


Meteor.setInterval(() => {
	momentUpdate.set(new Date());
}, 30 * 1000);

clientUtils = {
	isSmallScreen : function() {
		return innerWidth < 480;
	},

	formatDateTime : function(date) {
		return date ? clientUtils.moment(date).format("D MMM, YYYY HH:mm") : null;
	},

	fromNow : function(date) {
		return date ? clientUtils.moment(date).fromNow() : null;
	},

	moment : function(date) {
		if (date) {
			momentUpdate.get();
			var language = TAPi18n.getLanguage();
			if (!Object.keys(utils.getLanguages()).includes(language)) {
				language = "en";
			}
			return moment(date).locale(language);
		}
		return null;
	},

	toast : function(textKey) {
		toastText.set(TAPi18n.__(textKey));
		Meteor.setTimeout(function() {
			Meteor.setTimeout(function() {
				$("#toast").fadeOut(400);
			}, 0);
		}, toastDuration - 400);
		Meteor.setTimeout(function() {
			toastText.set(null);
		}, toastDuration);
	},

	isMobile : function() {
		try {
			document.createEvent("TouchEvent");
			return true;
		} catch (e) {
			return false;
		}
	},
}
