var irc = require('irc'),
	Sequelize = require("sequelize");

var sequelize = new Sequelize('irc', 'xxx', 'xxx');

var Users = sequelize.define('users', {
	id: { type: Sequelize.INTEGER, autoIncrement: true },
	nick: Sequelize.STRING,
	score: { type: Sequelize.INTEGER, defaultValue: 0 },
	up: { type: Sequelize.INTEGER, defaultValue: 0 },
	down: { type: Sequelize.INTEGER, defaultValue: 0 },
});//.sync({force:true});

var Votes = sequelize.define('votes', {
	id: { type: Sequelize.INTEGER, autoIncrement: true },
	action: Sequelize.STRING,
	user: Sequelize.STRING,
	reason: Sequelize.STRING,
	votes: { type: Sequelize.INTEGER, defaultValue: 0 },
	voters: Sequelize.STRING
});//.sync({force:true});

var App = (function() {

	var Actions = {
		none: 0,
		add: 1,
		vote: 2,
		voteUp: 3,
		voteDown: 4
	};

	var config = {
		threshold: 3,
		irc: {
			server: "xxxx",
			nick: "scorebot",
			channels: ["#xxx"]
		}
	};

	var users = [];
	Users.findAll().success(function(user) {
		users.push(user.nick);
	}).failure(function(){});

	var client = new irc.Client(config.irc.server, config.irc.nick, {
		channels: ["#xxx"],
	});

	client.addListener('message', function (from, to, message) {
		if(message.substring(0, 9) != config.irc.nick+":") {
			return false;
		}
		message = message.substring(10);
		var command = message.split(" ");

		switch(command[0]) {
			case "new":
				var user = command[1];
				var reason = command[2];
				reason = command.slice(2, command.length).join(" ");

				if(users.indexOf(user) == -1) {
					Users.create({
						id: null,
						nick: user,
						score: 0,
						up: 0,
						down: 0
					}).success(function(val) {
						users.push(val.nick);

						Votes.create({
							id: null,
							user: user,
							action: Actions.none,
							reason: reason,
							votes: 0,
							voters: from
						}).success(function(vote) {
							client.say(config.irc.channels[0], user +" has started leveling.  Leveling id# is: "+ vote.id);
						});
					});
				}
				break;
			case "vote":
				var id = command[1];
				var action = command[2];
				Votes.find({
					where: {id: id}
				}).success(function(vote) {
					if(vote == null) return;
					switch(action) {
						case "up":
							vote.votes++;
							break;
						case "down":
							vote.votes--;
							break;
						case "details":
							client.say(config.irc.channels[0], "#"+ vote.id +" reason: "+ vote.reason);
							return;
						default:
							break;
					}
					if(vote.votes > 4 || vote.votes == 0) return;

					client.say(config.irc.channels[0], vote.user +" "+ ((action=="up") ? "+" : "-") +"1 #"+ vote.id +" "+ vote.votes+"/4");
					if(vote.votes == 4) {
						Users.find({
							where: {nick: vote.user}
						}).success(function(user) {
							user.score++;
							user.up++;
							user.save();

							client.say(config.irc.channels[0], user.nick +" has gained +1 level.  Total: "+ user.score);
						});
					}
					vote.save();
				});
				break;
			case "level":
				var nick = command[1];
				Users.find({
					where: {nick: nick}
				}).success(function(user) {
					if(user == null) return;
					client.say(config.irc.channels[0], user.nick +": lvl "+ user.score);
				});
				break;
			default:
				break;
		}
	});

})();

Array.prototype.hasValue = function(value) {
	var i;
	for (i=0; i<this.length; i++) { if (this[i] === value) return true; }
	return false;
}