var callback = null;

Template.cancelButton.events({
	"click .cancel.button" : function(e) {
		if (callback) {
			callback();
		} else {
			dialog.set(null);
		}
	},
});

Template.cancelButton.onCreated(function() {
	callback = this.data.callback;
	document.addEventListener("keyup", escKeyListener);
});

Template.cancelButton.onDestroyed(function() {
	document.removeEventListener("keyup", escKeyListener);
});

function escKeyListener(e) {
	if (e.key == "Escape") {
		if (callback) {
			callback();
		} else {
			dialog.set(null);
		}
	}
}
