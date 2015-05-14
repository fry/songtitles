var audio = null

Template.channel.onCreated(function() {
  var instance = this;
  // Listen for changes to reactive variables (such as Router.current()).
  instance.autorun(function() {
    var channel = Router.current().params._id;
    var sub = instance.subscribe('messages', channel);
    if (sub.ready()) {
      window.scrollTo(0, document.body.scrollHeight);
    }
  });
});

Template.channel.onRendered(function() {
  $('article').css({'padding-bottom': $('footer').outerHeight()});
});

Template.channel.helpers({
  messages: function() {
    var _id = Router.current().params._id;
    return Messages.find({_channel: _id});
  },

  user: function() {
    return Meteor.users.findOne({_id: this._userId});
  },

  time: function() {
    return moment(this.timestamp).format('h:mm a');
  },

  points: function() {
    var _id = Router.current().params._id;
    return Channels.findOne({_id: _id}).points;
  },

  date: function() {
    var dateNow = moment(this.timestamp).calendar();
    var instance = Template.instance();
    if (!instance.date || instance.date != dateNow) {
      return instance.date = dateNow;
    }
  },

  avatar: function() {
    var user = Meteor.users.findOne({_id: this._userId});
    if (user && user.emails) {
      return Gravatar.imageUrl(user.emails[0].address);
    }
  },
});

Template.channelHeader.helpers({
  channel: function() {
    var _id = Router.current().params._id;
    return Channels.findOne({_id: _id});
  },

  gameStateButton: function() {
    var _id = Router.current().params._id;
    var channel = Channels.findOne({_id: _id});
    if (channel.gameFinished)
      return "Reset Game"
    if (channel.gameRunning)
      return "Stop Game"
    return "Start Game"
  }
})

Template.channelHeader.events({
  'click #startGameButton': function(event, instance) {
    event.preventDefault();

    var _id = Router.current().params._id;
    var channel = Channels.findOne({_id: _id});

    if (channel.gameRunning) {
      Channels.update({ _id: _id }, { $set: {
        gameFinished: true,
        gameRunning: false
      }})
    } else if (channel.gameFinished) {
      // Reset game
      Channels.update({ _id: _id }, { $set: {
        gameFinished: false,
        gameRunning: false,
        points: [],
        lastSpeaker: null
      }})
      Meteor.call("resetGame", _id)
      if (audio)
        audio.pause()
    } else {
      Channels.update({ _id: _id }, { $set: {
        gameRunning: true,
        gameFinished: false,
        points: [],
        lastSpeaker: null
      }})
    }
  }
})

function showError(msg) {
  console.log(msg)
  var dlg = $(".errorMessage")
  dlg.html(msg)
  dlg.show().delay(2000).fadeOut(300, function() {
    dlg.toggleClass("hidden", true)
  })
}

Template.messageForm.events({
  'keydown textarea': function(event, instance) {
    if (event.keyCode == 13 && !event.shiftKey) { // Check if enter was pressed (but without shift).
      event.preventDefault();
      var _id = Router.current().params._id;
      var value = instance.find('textarea').value;
      // Markdown requires double spaces at the end of the line to force line-breaks.
      value = value.replace("\n", "  \n");
      instance.find('textarea').value = ''; // Clear the textarea.

      Meteor.call("submitMessage", _id, value, function(err, res) {
        if (res == 0) {
          // Restore the autosize value.
          instance.$('textarea').css({height: 37});
          window.scrollTo(0, document.body.scrollHeight);
        } else {
          if (res == 1) {
            showError("Not your turn!");
          } else if (res == 2) {
            showError("Invalid song title!");
          } else {
            showError("Some error!")
          }
        }
      })
    }
    $('article').css({'padding-bottom': $('footer').outerHeight()});
  }
});

Template.messageBody.onCreated(function() {
  if (audio) {
    audio.pause()
    audio.src = this.data.preview_url
  } else
    audio = new Audio(this.data.preview_url)
  audio.play()
})
