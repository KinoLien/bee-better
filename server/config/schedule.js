
const schedule = require('node-schedule');
const utils = require('../services/utils');
const interface = require('../services/data-interface');
const nunjucks = require('nunjucks');

const labelsMap = {
	"Lat": "Lux",
	"Tem2": "WD",
	"Hum2": "WS",
	"Tem3": "Soil"
};

const reportSafeRanges = {
	"Tem1": [24, 27],
	"Hum1": [45, 75],
	"Hum2": [0, 10]
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

			const srs = reportSafeRanges;
			const safeKeys = Object.keys(srs);

			const outputCells = [];

			// conditions for normal range
			cellResults.forEach((results, cidx) => {
				const totalCount = results.length;
				const keyRecordStatus = {};
				const keyCacheDate = {};
				const keyRangeDate = {};
				const outputFields = [];
				safeKeys.forEach(k => { 
					keyRecordStatus[k] = false;
					keyCacheDate[k] = '';
					keyRangeDate[k] = [];
				});
				results.forEach(o => {
					safeKeys.forEach(k => {
						if (o[k] < srs[k][0] || o[k] > srs[k][1]) {
							if (keyRecordStatus[k] === false) {
								keyCacheDate[k] = o["Time_convert"];
								keyRecordStatus[k] = true;	
							}
						} else {
							if (keyRecordStatus[k] === true) {
								keyRangeDate[k].push([keyCacheDate[k], o["Time_convert"]]);
								keyRecordStatus[k] = false;
							}
						}
					});
				});

				safeKeys.forEach(k => {
					outputFields.push({
						name: labelsMap[k] || k,
						ranges: keyRangeDate[k].map(lr => {
							return {
								start: utils.to24hFormat(new Date(lr[0])),
								end: utils.to24hFormat(new Date(lr[1]))
							};
						})
					});
				});

				outputCells.push({
					name: cellIds[cidx],
					fields: outputFields
				});
			});

			const resHtml = nunjucks.render('../views/templates/email/report.njk', { cells: outputCells });

			console.log(resHtml);
		});
	});
};
