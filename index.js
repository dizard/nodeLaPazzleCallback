var Redis = require('ioredis');

/**
 *
 * @param r_data
 */

module.exports = {
    listSub : {},
    suffix : '',
    redis : null,
    redisPush : null,


    nameChannel : function(channel) {
        return channel + this.suffix;
    },

    init: function(settings) {
        if (!this.redis) {
            if (settings.cluster) {
                this.redis = new Redis.Cluster(settings.cluster);
            }else{
                this.redis = new Redis(settings);
            }

            this.redis.on('error', function(err) {
                this.trigger('error', err);
            }.bind(this));

            this.redis.on('authError', function(err) {
                this.trigger('error', err);
            }.bind(this));

            this.redis.on('message', function (ev, rawMsgData) {
                var data = JSON.parse(rawMsgData);

                this.trigger(data.channel, data.data, {
                    channelAnswer : data.channelAnswer
                });
                var r_data = {
                    data:data.data,
                    channel:data.channel
                };
                this.trigger('message', r_data, {
                    channelAnswer : data.channelAnswer
                });
            }.bind(this));

            this.redis.on("connect", function () {
                this.redis.subscribe('php.socket.channels.service');
            }.bind(this));
        }
        if (!this.redisPush) {
            if (settings.cluster) {
                this.redisPush = new Redis.Cluster(settings.cluster);
            }else{
                this.redisPush = new Redis(settings);
            }

            this.redisPush.on('error', function(err) {
                this.trigger('error', err);
            }.bind(this));

            this.redisPush.on('authError', function(err) {
                this.trigger('error', err);
            }.bind(this));
        }
    },

    trigger : function(event, data, response) {
        if (this.listSub[event]) {
            this.listSub[event].forEach(function(clb) {
                try{
                    clb(data, response)
                }catch(e) {}
            });
        }

        return this;
    },

    answer : function(response) {
        this.redisPush.lpush(response.channelAnswer, JSON.stringify(response.data));
        this.redisPush.expire(response.channelAnswer, 60);
    },

	off : function(channel) {
        this.listSub[this.nameChannel(channel)] = [];
        return this;
    },
    single : function(channel, clb) {
        this.listSub[this.nameChannel(channel)] = [];
        this.listSub[this.nameChannel(channel)].push(clb);
        return this;
    },
    on : function(channel, clb) {
        if (!this.listSub[this.nameChannel(channel)]) {
            this.listSub[this.nameChannel(channel)] = [];
        }
        this.listSub[this.nameChannel(channel)].push(clb);
		return this;
    },
    setSuffix : function(suffix) {
        this.suffix = '.' + suffix;
		return this;
    }
}