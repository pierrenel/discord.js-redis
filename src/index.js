const ClientDataManager = require('./ClientDataManagerExtension');
const RedisInterface = require('./RedisInterface');

module.exports = (options) => {
  const r = new RedisInterface(options);
  return (client) => {
    // eslint-disable-next-line no-param-reassign
    client.dataManager = new ClientDataManager(client, r);
    client.once('ready', () => {
      const q = r.client.multi();
      const queries = client.users.map(u => q.hmsetAsync(`user:${u.id}`, RedisInterface.clean(u)));
      queries.push(...client.channels.map(c => q.hmsetAsync(`channel:${c.id}`, RedisInterface.clean(c))));
      queries.push(...client.guilds.map(g => q.hmsetAsync(`guild:${g.id}`, RedisInterface.clean(g))));
      queries.push(...client.emojis.map(e => q.hmsetAsync(`emoji:${e.id}`, RedisInterface.clean(e))));
      return Promise.all(queries).then(() => q.execAsync());
    });
    client.on('message', r.setMessage.bind(this));
    client.on('messageDelete', r.deleteMessage.bind(this));
    client.on('messageUpdate', (o, n) => r.setMessage(n));
    client.on('messageDeleteBulk', (messages) => {
      const q = r.client.multi();
      return Promise.all(messages.map(m => q.hdelAsync(`message:${m.id}`)))
        .then(() => q.execAsync());
    });
  };
};
