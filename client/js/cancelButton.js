var callbacks = {};

Template.cancelButton.events({
	"click .cancel.button" : function(e) {
		if (this.callback) {
			this.callback();
		} else {
			dialog.set(null);
		}
	},
});

Template.cancelButton.onCreated(function() {
	callbacks[dialog.get()] = this.data && this.data.callback;
	document.addEventListener("keyup", escKeyListener);
});

Template.cancelButton.onDestroyed(function() {
	document.removeEventListener("keyup", escKeyListener);
});

function escKeyListener(e) {
	if (e.key == "Escape") {
		if (callbacks[dialog.get()]) {
			callbacks[dialog.get()]();
		} else {
			dialog.set(null);
		}
	}
}
