const g = require('../../g');
const Room = require('../../room/room');
const Mem = require('../../memory');
const startupUtils = require('./startupUtils');
const Roster = require('../../roster');
const gruntA = require('../../creeps/gruntA');

class StartupAgency {
	constructor() {
		this.mem = new Mem('StartupAgency');
		this.phaseData = this.mem.item('phaseData', {});

		const myRooms = Room.all('owned');
		this.room = myRooms[0];
		this.sources = this.room.mem.sources;
		this.sources = this.sources ? this.sources.orderPreference.map(sourceId => this.sources.entries[sourceId]) : null;

		this.isInStartupMode = this.getIsInStartupMode();

		g.defer(this.sitRep.bind(this), ['startupAgency_sitRep'], 10);
	}

	getIsInStartupMode() {
		return true;
	}

	sitRep() {
		if (!this.isInStartupMode || !this.sources)
			return;

		if (!this.phaseData.phase || !this.phaseData.sources) {
			this.phaseData.phase = 1;

			this.phaseData.sources = this.sources.map(source => ({
				sourceId: source.id,
				gruntANeeded: startupUtils.gruntACountNeededToMineSource(source),
				gruntALeadTIme: startupUtils.gruntALeadTIme(source),
				gruntARoster: Roster.creepsListHolder(),
				gruntBNeeded: startupUtils.gruntBCountNeededToMineSource(source),
				gruntBLeadTIme: startupUtils.gruntBLeadTIme(source),
				gruntBRoster: Roster.creepsListHolder(),
			}));
			this.phaseData.gruntAMinerNeeded = this.phaseData.sources.reduce((aggr, data) => aggr + data.gruntANeeded, 0);
			this.phaseData.gruntBMinerNeeded = this.phaseData.sources.reduce((aggr, data) => aggr + data.gruntBNeeded, 0);
			this.phaseData.gruntACount = 0;
			this.phaseData.gruntBCount = 0;
		}
	}

	process() {
		switch (this.phaseData.phase) {
			case 1:
				if (this.phaseData.sources)
					this.phase1();
				break;
		}
	}

	phase1() {
		// g.defer(()=>{
		// }, ['startupAgency_phase1']);

		this.phaseData.sources.forEach((sData, ind) => {
			const gruntARoster = new Roster(
				'gruntA_S'+sData.sourceId,
				sData.gruntANeeded,
				sData.gruntARoster,
				()=>sData.gruntALeadTIme,
				()=>[
					[MOVE, CARRY, MOVE, WORK],
					`gruntA_S${sData.sourceId}_C${Math.random().toString().substr(2, 16)}`,
					{
						memory: {
							bData: {
								gruntA: {
									sourceId: sData.sourceId,
									dropOff: {x: this.room.mem.spawnPos[0].x, y: this.room.mem.spawnPos[0].y}
								}
							}
						}
					}
				],
				Math.max(4 - ind, 0.5)
			);

			gruntARoster.forEach(creep => gruntA.behaviour(creep, this.phase));
		});
	}
}

module.exports = StartupAgency;