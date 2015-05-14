Channels = new Mongo.Collection('channels');

if (Meteor.isServer) {
  function sanitize(str) {
    return str.replace("'", "").toUpperCase()
  }

  Channels.allow({
    insert: function(userId, doc) {
      if (userId) {
        return true;
      }
    }
  });

  Meteor.publish('channels', function() {
    if (this.userId) {
      return Channels.find();
    }
  });

  Meteor.methods({
    submitMessage: function(channel, message) {
      var userId = this.userId

      var url = "https://api.spotify.com/v1/search"
      var params = {
        type: "track",
        q: "track:\"" + message + "\""
      }

      var result = HTTP.get(url, { params: params } )
      var track_match = _.find(result.data.tracks.items, function(track) {
        return sanitize(track.name) === sanitize(message)
      })

      if (track_match) {
        Messages.insert({
          _channel: channel, // Channel reference.
          message: track_match.name,
          artist: track_match.artists[0].name,
          preview_url: track_match.preview_url,
          _userId: userId, // Add userId to each message.
          timestamp: new Date() // Add a timestamp to each message.
        });
        return track_match.preview_url
      }

      return false
    }
  })
}

