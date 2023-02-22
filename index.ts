import {
	EntityManager,
	EventsSDK,
	GameState,
	item_blink,
	LocalPlayer,
	Menu,
	monkey_king_tree_dance,
	ParticleAttachment,
	ParticlesSDK,
	TickSleeper,
	Vector3
} from "github.com/octarine-public/wrapper/index"

const particles = new ParticlesSDK(),
	Sleeper = new TickSleeper()

const Entry = Menu.AddEntry("Utility")
const MKHateTree = Entry.AddNode(
	"MK Catcher",
	"panorama/images/spellicons/monkey_king_tree_dance_png.vtex_c",
	undefined,
	0
)
const MKHateState = MKHateTree.AddToggle("State")
const MKHateUseOnAlly = MKHateTree.AddToggle("Use on ally")
const MKHateUseBlink = MKHateTree.AddToggle("Use blink")
const MKHateItemsState = MKHateTree.AddImageSelector(
	"Item destroyer tree",
	["item_quelling_blade", "item_tango", "item_tango_single", "item_bfury"],
	new Map([
		["item_quelling_blade", true],
		["item_tango", true],
		["item_tango_single", true],
		["item_bfury", true]
	])
)

EventsSDK.on("PostDataUpdate", () => {
	const MyHero = LocalPlayer?.Hero
	if (!MKHateState.value || MyHero === undefined) {
		particles.DestroyAll()
		return
	}

	const CanCast =
		MyHero.IsAlive &&
		!MyHero.IsStunned &&
		!MyHero.IsInvulnerable &&
		!MyHero.IsInvisible &&
		!Sleeper.Sleeping
		
	EntityManager.GetEntitiesByClass(monkey_king_tree_dance).some(abil => {
		if (abil.TargetTree === undefined || !abil.TargetTree.IsAlive) {
			particles.DestroyByKey(abil)
			return false
		}
		const owner = abil.Owner
		if (owner === undefined || owner === MyHero || (!MKHateUseOnAlly.value && !owner.IsEnemy())) {
			particles.DestroyByKey(abil)
			return false
		}

		const tree = abil.TargetTree
		const particlePos = tree.Position.Clone().AddScalarZ(250)
		particles.AddOrUpdate(
			abil,
			"particles/units/heroes/hero_skywrath_mage/skywrath_mage_concussive_shot.vpcf",
			ParticleAttachment.PATTACH_CUSTOMORIGIN,
			MyHero,
			[0, particlePos],
			[1, particlePos],
			[2, new Vector3(3000)]
		)

		if (!CanCast || Sleeper.Sleeping) {
			return false
		}

		const castTime = 100 + MyHero.TurnTime(tree.Position) * 1000 + GameState.Ping
		return MKHateItemsState.values.some(value => {
			if (!MKHateItemsState.IsEnabled(value)) {
				return false
			}

			const castAbil = MyHero.GetItemByName(value)
			if (castAbil === undefined) {
				return false
			}

			// if cast range < cast range selected item try use blink in tree position
			if (MKHateUseBlink.value && !MyHero.IsInRange(tree, castAbil.CastRange)) {
				const blink = MyHero.GetItemByClass(item_blink)
				if (
					blink === undefined ||
					!MyHero.IsInRange(tree, blink.CastRange - 10 + castAbil.CastRange) ||
					!blink.CanBeCasted()
				) {
					return false
				}

				MyHero.CastPosition(
					blink,
					MyHero.Position.Extend(
						tree.Position,
						Math.min(blink.CastRange - 10, MyHero.Distance(tree) - castAbil.CastRange / 2)
					)
				)
				Sleeper.Sleep(castTime)
				return true
			}

			if (!MyHero.IsInRange(tree, castAbil.CastRange) || !castAbil.CanBeCasted()) {
				return false
			}

			MyHero.CastTargetTree(castAbil, tree)
			Sleeper.Sleep(castTime)
			return true
		})
	})
})
EventsSDK.on("GameEnded", () => {
	particles.DestroyAll()
	Sleeper.ResetTimer()
})
