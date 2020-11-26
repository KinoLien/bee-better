
var schedule = require('node-schedule');
var utils = require('../services/utils');
var interface = require('../services/data-interface');
// var j = schedule.scheduleJob('42 * * * *', function(){
//   console.log('The answer to life, the universe, and everything!');
// });

const labelsMap = {
	"Lat": "Lux",
	"Tem2": "WD",
	"Hum2": "WS",
	"Tem3": "Soil"
};

module.exports = function() {
	schedule.scheduleJob('5 0 * * *', async function(){
		// console.log('The answer to life, the universe, and everything!');
		
		const users = await interface.getAllUsers();
		const reportUsers = users.filter(u => u.dailyReport === true);

		const yesterday = new Date();
		yesterday.setDate((new Date()).getDate() - 1);

		const startDate = new Date(yesterday.setHours(0,0,0)).toISOString();
		const endDate = new Date(yesterday.setHours(23,59,59)).toISOString();
		
		reportUsers.forEach(async user => {
			const cellIds = user.cells.map(cRef => cRef.id);
			const cellResults = await Promise.all(
				cellIds.map(cellId => {
					return interface.getCellData(cellId, startDate, endDate);
				})
			);

			// conditions for normal range
		});
	});
};
