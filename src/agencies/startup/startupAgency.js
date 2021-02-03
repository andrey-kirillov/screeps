const g = require('../../g');
const Room = require('../../room/room');
const Mem = require('../../memory');
const startupUtils = require('./startupUtils');
const Roster = require('../../roster');
const gruntA = require('../../creeps/gruntA');
const gruntBMiner = require('../../creeps/gruntBMiner');
const rally = require('../../creeps/rally');
const decommission = require('../../creeps/decommission');

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
			this.phaseData.gruntBMinerNeeded = this.phaseData.sources.reduce((aggr, data) => aggr + data.gruntBNeeded, 0);
		}
	}

	process() {
		g.defer(()=>{
			switch (this.phaseData.phase) {
				case 1:
					if (this.room._room.energyAvailable !== this.room._room.energyCapacityAvailable)
						break;
					const phase2_valueNeeded = (this.phaseData.gruntBMinerNeeded+1) * 300;
					const gruntAValue = this.phaseData.sources.reduce((sAggr, source)=>{
						return sAggr + source.gruntARoster.list.reduce((gAggr, creepData)=>{
							const creep = Game.getObjectById(creepData.id);
							if (!creep)
								return gAggr;

							return gAggr + (250 / 1500 * creep.ticksToLive);
						}, 0)
					}, 0);
					console.log(gruntAValue);
					if (gruntAValue > phase2_valueNeeded)
						this.phaseData.phase = 2;
					break;
			}
		}, ['startupAgency_phase']);

		switch (this.phaseData.phase) {
			case 1:
				if (this.phaseData.sources)
					this.phase1();
				break;
			case 2:
				if (this.room.mem.rallyPos)
					this.phase2();
				break;
		}
	}

	phase1() {
		this.phaseData.sources.forEach((sData, ind) => {
			const gruntARoster = new Roster(
				'gruntA_S'+sData.sourceId,
				sData.gruntANeeded,
				sData.gruntARoster,
				()=>sData.gruntALeadTIme,
				()=>[
					[MOVE, CARRY, MOVE, WORK, MOVE],
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

	phase2() {
		const terrain = this.room._room.getTerrain();
		if (!this.phaseData.carrierRoster)
			this.phaseData.carrierRoster = Roster.creepsListHolder();

		this.phaseData.sources.forEach((sData, ind) => {
			const rsData = this.room.mem.sources.entries[sData.sourceId];

			if (!rsData.containerConstructionId) {
				const res = this.room._room.createConstructionSite(rsData.miningPositions[0].x, rsData.miningPositions[0].y, STRUCTURE_CONTAINER);
				if (res !== OK)
					console.log('error occurred trying to place source container site: '+res+' '+sData.sourceId);

				rsData.containerConstructionId = this.room._room
					.lookForAt(LOOK_CONSTRUCTION_SITES, rsData.miningPositions[0].x, rsData.miningPositions[0].y)
					.map(cs => cs.id).find(cs => true);
			}

			if (!rsData.containerConstructionId) {
				rsData.containerId = this.room._room
					.lookForAt(LOOK_STRUCTURES, rsData.miningPositions[0].x, rsData.miningPositions[0].y)
					.map(cs => cs.id).find(cs => true);
			}

			const gruntARoster = new Roster(
				'gruntA_S' + sData.sourceId,
				0,
				sData.gruntARoster
			);

			gruntARoster.forEach((creep, _ind) => {
				if (_ind)
					rally.behaviour(creep, this.room.mem.rallyPos, terrain);
				else
					decommission.behaviour(creep, this.room);
			});

			const gruntBMinerRoster = new Roster(
				'gruntB_miner_S'+sData.sourceId,
				sData.gruntBNeeded,
				sData.gruntBRoster,
				()=>sData.gruntBLeadTIme,
				()=>[
					[MOVE, CARRY, WORK, WORK],
					`gruntB_C${Math.random().toString().substr(2, 16)}`,
					{
						memory: {
							bData: {
								gruntBMiner: {
									sourceId: sData.sourceId
								}
							}
						}
					}
				],
				Math.max(4 - ind, 0.5)
			);

			gruntBMinerRoster.forEach((creep, _ind) => {
				gruntBMiner.behaviour(creep, _ind, rsData);
			});
		});

		const carrierMinForMining = Object.values(this.room.mem.sources.entries).reduce((aggr, source) => {
			return aggr + ((source.miningPositions.length * 1.9) / (150 / (source.miningPosition[0].pathCost + 2)));
		}, 0);

		const carrierRoster = new Roster(
			'carrier_R'+this.room.name,
			carrierMinForMining,
			this.phaseData.carrierRoster,
			()=>20,
			()=>[
				[MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
				`carrier_C${Math.random().toString().substr(2, 16)}`,
				{
					memory: {
						bData: {
							carrier: {
								sourceId: sData.sourceId
							}
						}
					}
				}
			],
			1
		);
	}
}

module.exports = StartupAgency;