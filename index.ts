import { EntityManager, EventsSDK, GameState, item_blink, LocalPlayer, Menu, monkey_king_tree_dance, ParticleAttachment_t, ParticlesSDK, TickSleeper, Vector3 } from "github.com/octarine-public/wrapper/index"

const particles = new ParticlesSDK(),
	Sleeper = new TickSleeper()

const Entry = Menu.AddEntry("Utility")
const MKHateTree = Entry.AddNode("MK Catcher", "panorama/images/spellicons/monkey_king_tree_dance_png.vtex_c", undefined, 0)
const MKHateState = MKHateTree.AddToggle("State")
const MKHateUseOnAlly = MKHateTree.AddToggle("Use on ally")
const MKHateUseBlink = MKHateTree.AddToggle("Use blink")
const MKHateItemsState = MKHateTree.AddImageSelector("Item destroyer tree", [
	"item_quelling_blade",
	"item_tango",
	"item_tango_single",
	"item_bfury",
], new Map([
	["item_quelling_blade", true],
	["item_tango", true],
	["item_tango_single", true],
	["item_bfury", true],
]))

EventsSDK.on("PostDataUpdate", () => {
	const MyHero = LocalPlayer?.Hero
	if (
		!MKHateState.value
		|| MyHero === undefined
	) {
		particles.DestroyAll()
		return
	}

	const CanCast = (
		MyHero.IsAlive
		&& !MyHero.IsStunned
		&& !MyHero.IsInvulnerable
		&& (!MyHero.IsInvisible || MyHero.IsVisibleForEnemies)
		&& !Sleeper.Sleeping
	)
	EntityManager.GetEntitiesByClass(monkey_king_tree_dance).some(abil => {
		if (abil.TargetTree === undefined || !abil.TargetTree.IsAlive) {
			particles.DestroyByKey(abil)
			return false
		}
		const owner = abil.Owner
		if (
			owner === undefined
			|| owner === MyHero
			|| (!MKHateUseOnAlly.value && !owner.IsEnemy())
		) {
			particles.DestroyByKey(abil)
			return false
		}

		const tree = abil.TargetTree
		const particle_pos = tree.Position.Clone().AddScalarZ(250)
		particles.AddOrUpdate(
			abil,
			"particles/units/heroes/hero_skywrath_mage/skywrath_mage_concussive_shot.vpcf",
			ParticleAttachment_t.PATTACH_CUSTOMORIGIN,
			MyHero,
			[0, particle_pos],
			[1, particle_pos],
			[2, new Vector3(3000)],
		)

		if (!CanCast || Sleeper.Sleeping)
			return false

		const cast_time = 100 + MyHero.TurnTime(tree.Position) * 1000 + GameState.Ping
		return MKHateItemsState.values.some(value => {
			if (!MKHateItemsState.IsEnabled(value))
				return false

			const cast_abil = MyHero.GetItemByName(value)
			if (cast_abil === undefined)
				return false

			// if cast range < cast range selected item try use blink in tree position
			if (MKHateUseBlink.value && !MyHero.IsInRange(tree, cast_abil.CastRange)) {
				const blink = MyHero.GetItemByClass(item_blink)
				if (
					blink === undefined
					|| !MyHero.IsInRange(tree, blink.CastRange - 10 + cast_abil.CastRange)
					|| !blink.CanBeCasted()
				)
					return false

				MyHero.CastPosition(blink, MyHero.Position.Extend(
					tree.Position,
					Math.min(blink.CastRange - 10, MyHero.Distance(tree) - (cast_abil.CastRange / 2)),
				))
				Sleeper.Sleep(cast_time)
				return true
			}

			if (!MyHero.IsInRange(tree, cast_abil.CastRange) || !cast_abil.CanBeCasted())
				return false

			MyHero.CastTargetTree(cast_abil, tree)
			Sleeper.Sleep(cast_time)
			return true
		})
	})
})
EventsSDK.on("GameEnded", () => {
	particles.DestroyAll()
	Sleeper.ResetTimer()
})
