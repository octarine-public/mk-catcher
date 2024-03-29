import { Menu, Utils } from "github.com/octarine-public/wrapper/index"

const path = "github.com/octarine-public/mk-catcher/scripts_files"
const Load = (name: string) => {
	return new Map<string, string>(Object.entries(Utils.readJSON(`${path}/translate/${name}.json`)))
}

Menu.Localization.AddLocalizationUnit("russian", Load("ru"))
Menu.Localization.AddLocalizationUnit("english", Load("en"))
Menu.Localization.AddLocalizationUnit("сhinese", Load("cn"))
