Channels = new Mongo.Collection('channels');

if (Meteor.isServer) {
  function sanitize(str) {
    if (str.indexOf("-") >= 0) {
      str = str.split(" - ")[0];
    }
    return str.replace(/\W/g, '').toUpperCase();
  }

  Channels.allow({
    insert: function(userId, doc) {
      if (userId) {
        return true;
      }
    },
    update: function(userId, doc) {
      if (userId) {
        return true;
      }
    },
  });

  Meteor.publish('channels', function() {
    if (this.userId) {
      return Channels.find();
    }
  });

  Meteor.methods({
    submitMessage: function(channel, message) {
      var userId = this.userId

      var channel_obj = Channels.findOne({ _id: channel });
      if (channel_obj.lastSpeaker === userId && channel_obj.gameRunning) {
        return 1
      }

      var url = "https://api.spotify.com/v1/search"
      var params = {
        type: "track",
        q: "track:\"" + message + "\""
      }

      var result = HTTP.get(url, { params: params } )
      //var tracks = _.sortBy(result.data.tracks.items, 'popularity').reverse();
      var track_match = _.find(result.data.tracks.items, function(track) {
        return sanitize(track.name) === sanitize(message)
      })

      if (track_match) {
        Messages.insert({
          _channel: channel, // Channel reference.
          message: (track_match.name.indexOf("-")>=0)?track_match.name.split(" - ")[0]:track_match.name,
          artist: track_match.artists[0].name,
          preview_url: track_match.preview_url,
          image: track_match.album.images[2].url,
          _userId: userId, // Add userId to each message.
          timestamp: new Date() // Add a timestamp to each message.
        });

        var points = channel_obj.points
        if (!points) {
          points = []
        }

        var player_points = _.find(points, function(point) {
          return point._userId === userId
        })

        if (!player_points) {
          var user = Meteor.users.findOne({ _id: userId })
          var user_name = user.username
          player_points = {
            _userId: userId,
            _channel: channel,
            name: user_name,
            points: 1
          }

          points.push(player_points)
        } else {
          player_points.points += 1
        }

        console.log(points)

        Channels.update({ _id: channel }, { $set: {
          lastSpeaker: userId,
          points: points
        } })

        return 0
      }

      return 2
    }
  })
}
