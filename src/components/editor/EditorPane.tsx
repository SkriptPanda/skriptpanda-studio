import { useEffect, useMemo, useRef } from "react";
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react";
import type * as monacoTypes from "monaco-editor";
import { FileLeaf } from "@/lib/fs";

let skriptCompletionRegistered = false;

export type EditorPaneProps = {
  file: FileLeaf | null;
  onChange: (value: string) => void;
  themeKey: string;
  onCursorChange?: (pos: { line: number; column: number }) => void;
};

function getMonacoTheme(themeKey: string) {
  switch (themeKey) {
    case "sp-dark": return "skriptpanda-dark";
    case "sp-light": return "skriptpanda-light";
    case "dracula": return "dracula";
    case "solarized": return "solarized-light";
    default: return "skriptpanda-dark";
  }
}

export function EditorPane({ file, onChange, themeKey, onCursorChange }: EditorPaneProps) {
  const monacoRef = useRef<monacoTypes.editor.IStandaloneCodeEditor | null>(null);

  const language = useMemo(() => {
    if (!file) return "plaintext";
    if (file.name.endsWith(".sk")) return "skript";
    if (file.name.endsWith(".md")) return "markdown";
    if (file.name.endsWith(".json")) return "json";
    return "plaintext";
  }, [file]);

  const beforeMount: BeforeMount = (monaco) => {
    if (!monaco.languages.getLanguages().some((l) => l.id === "skript")) {
      monaco.languages.register({ id: "skript" });
      monaco.languages.setMonarchTokensProvider("skript", {
        tokenizer: {
          root: [
            [/^\s*#.*/, "comment"],
            [/\b(on|every|at|command|trigger|if|else|loop|set|to|send|message|player|event|function|return|stop|while|parse|add|remove|delete|clear|wait|teleport|kill|heal|damage|broadcast|execute|cancel|give|take)\b/, "keyword"],
            [/\b(true|false|null|yes|no)\b/, "constant"],
            [/\b(join|first join|quit|disconnect|login|kick|chat|async chat|bed enter|bed leave|bucket empty|bucket fill|command|consume|damage|death|drop|experience change|exp spawn|experience spawn|flight toggle|food level change|gamemode change|heal|hunger drain|interact|interact at|item break|item damage|item mend|leftclick|left click|level change|pickup|pick up|player animation|player recipe discover|prepare craft|prepare enchant|prepare smith|riptide|rightclick|right click|shear|sneak toggle|sprint toggle|swap hand items|teleport|tool change|breed|combust|creeper power|entity block form|entity change block|entity place|explode|horse jump|piglin barter|projectile hit|projectile launch|regain health|ride|slime split|spawn|target|tame|transform|unleash|untarget|block damage|break|mine|burn|can build check|decay|fade|fertilize|form|flow|from to|grow|ignite|spread|piston extend|piston retract|place|physics|redstone|sign change|sponge absorb|structure grow|book edit|book sign|enchant|enchant prepare|furnace burn|furnace smelt|inventory click|inventory close|inventory open|inventory pick up|item despawn|item merge|item spawn|smith|lightning|portal|portal create|portal enter|spawn change|thunder change|weather change|server ping|server list ping|tab complete|script load|script unload|server load|server stop|vehicle create|vehicle damage|vehicle destroy|vehicle enter|vehicle exit|vehicle move|chunk populate|chunk generate|chunk load|chunk unload|command pre process|hanging break|hanging place|loot generate|note play|player statistic increment|pressure|tripwire|vehicle collide|armor stand manipulate|armor change|bee breed|bee enter hive|bee leave hive|bee pollinate|bound create|bound enter|bound exit|brush|camel dash|calibrated sculk sensor resonate|chiseled bookshelf book place|chiseled bookshelf book take|chiseled bookshelf search|custom drop|custom item craft|custom recipe discover|hanging sign edit|nbt compound add|nbt compound remove|ocelot attack|particle spawn|scoreboard objective create|scoreboard objective remove|scoreboard score set|scoreboard score reset|sniffer dig|sniffer egg hatch|sniffer explore|strider shiver|ticket acquire|virtual furnace smelt|villager career change|wandering trader spawn|world creator|region enter|region exit|region change|region border|anvil|skquery enable|skquery disable|script start|script stop|connect|motd request|ping|gui click|gui open|gui close|gui slot change|yaml load|yaml loading|yaml value change)\b/, "event"],
            [/\d+/, "number"],
            [/"[^"]*"/, "string"],
            [/'[^']*'/, "string"],
            [/\/[a-zA-Z\-]+/, "type"], // commands like /hello
            [/:$/, "colon"], // colon at end of line
          ],
        },
      } as any);

      // Configure language settings for proper indentation
      monaco.languages.setLanguageConfiguration("skript", {
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')']
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        indentationRules: {
          increaseIndentPattern: /.*:$/,
          decreaseIndentPattern: /^\s*(else|elif).*$/
        },
        onEnterRules: [
          {
            beforeText: /.*:$/,
            action: { indentAction: monaco.languages.IndentAction.Indent }
          }
        ]
      });
    }

    if (!skriptCompletionRegistered) {
      skriptCompletionRegistered = true;
      const keywords = [
        "command", "trigger", "if", "else", "loop", "set", "to", "send", "message", "player", "event", "function", "return", "stop", "on", "every", "at", "while", "parse", "add", "remove", "delete", "clear", "wait", "teleport", "kill", "heal", "damage", "broadcast", "execute", "cancel", "give", "take"
      ];
      // Create comprehensive event snippets from python.md
      const eventSnippets = [
        // Base Skript Events - Player Events
        { label: "on join", insertText: 'on join:\n\t${1:# Player joins the server}', documentation: "Triggered when a player joins the server. Event-values: event-player" },
        { label: "on first join", insertText: 'on first join:\n\t${1:# Player first join}', documentation: "Triggered only on a player's first-ever join to the server" },
        { label: "on quit", insertText: 'on quit:\n\t${1:# Player leaves server}', documentation: "Triggered when a player leaves the server" },
        { label: "on disconnect", insertText: 'on disconnect:\n\t${1:# Player disconnects}', documentation: "Triggered when a player leaves the server" },
        { label: "on login", insertText: 'on login:\n\t${1:# Player login process}', documentation: "Triggered during the login process after authentication" },
        { label: "on kick", insertText: 'on kick:\n\t${1:# Player is kicked}', documentation: "Triggered when a player is kicked" },
        { label: "on chat", insertText: 'on chat:\n\t${1:# Player sends chat message}', documentation: "Triggered when a player sends a chat message" },
        { label: "on async chat", insertText: 'on async chat:\n\t${1:# Async chat event}', documentation: "Similar to on chat, but for asynchronous chat events" },
        { label: "on bed enter", insertText: 'on bed enter:\n\t${1:# Player enters bed}', documentation: "Triggered when a player enters a bed" },
        { label: "on bed leave", insertText: 'on bed leave:\n\t${1:# Player leaves bed}', documentation: "Triggered when a player leaves a bed" },
        { label: "on bucket empty", insertText: 'on bucket empty:\n\t${1:# Player empties bucket}', documentation: "Triggered when a player empties a bucket" },
        { label: "on bucket fill", insertText: 'on bucket fill:\n\t${1:# Player fills bucket}', documentation: "Triggered when a player fills a bucket" },
        { label: "on command", insertText: 'on command:\n\t${1:# Player executes command}', documentation: "Triggered when a player executes a command" },
        { label: "on consume", insertText: 'on consume:\n\t${1:# Player consumes item}', documentation: "Triggered when a player consumes an item (food or potion)" },
        { label: "on damage", insertText: 'on damage:\n\t${1:# Entity is damaged}', documentation: "Triggered when an entity is damaged" },
        { label: "on death", insertText: 'on death:\n\t${1:# Entity dies}', documentation: "Triggered when an entity dies" },
        { label: "on drop", insertText: 'on drop:\n\t${1:# Player drops item}', documentation: "Triggered when a player drops an item" },
        { label: "on experience change", insertText: 'on experience change:\n\t${1:# Player experience changes}', documentation: "Triggered when a player's experience changes" },
        { label: "on exp spawn", insertText: 'on exp spawn:\n\t${1:# Experience orbs spawn}', documentation: "Triggered when experience orbs spawn" },
        { label: "on experience spawn", insertText: 'on experience spawn:\n\t${1:# Experience orbs spawn}', documentation: "Triggered when experience orbs spawn" },
        { label: "on flight toggle", insertText: 'on flight toggle:\n\t${1:# Player toggles flight}', documentation: "Triggered when a player toggles flight" },
        { label: "on food level change", insertText: 'on food level change:\n\t${1:# Player food level changes}', documentation: "Triggered when a player's food level changes" },
        { label: "on gamemode change", insertText: 'on gamemode change:\n\t${1:# Player gamemode changes}', documentation: "Triggered when a player's gamemode changes" },
        { label: "on heal", insertText: 'on heal:\n\t${1:# Entity is healed}', documentation: "Triggered when an entity is healed" },
        { label: "on hunger drain", insertText: 'on hunger drain:\n\t${1:# Player hunger drains}', documentation: "Triggered when a player's hunger drains" },
        { label: "on interact", insertText: 'on interact:\n\t${1:# Player interacts}', documentation: "Triggered when a player interacts with something" },
        { label: "on interact at", insertText: 'on interact at:\n\t${1:# Precise interact-at-entity}', documentation: "Triggered for precise interact-at-entity events" },
        { label: "on item break", insertText: 'on item break:\n\t${1:# Player item breaks}', documentation: "Triggered when a player's item breaks" },
        { label: "on item damage", insertText: 'on item damage:\n\t${1:# Item is damaged}', documentation: "Triggered when an item is damaged" },
        { label: "on item mend", insertText: 'on item mend:\n\t${1:# Item is mended}', documentation: "Triggered when an item is mended by experience" },
        { label: "on leftclick", insertText: 'on leftclick:\n\t${1:# Left click action}', documentation: "Triggered on left-click actions" },
        { label: "on left click", insertText: 'on left click:\n\t${1:# Left click action}', documentation: "Triggered on left-click actions" },
        { label: "on level change", insertText: 'on level change:\n\t${1:# Player level changes}', documentation: "Triggered when a player's level changes" },
        { label: "on pickup", insertText: 'on pickup:\n\t${1:# Player picks up item}', documentation: "Triggered when a player picks up an item" },
        { label: "on pick up", insertText: 'on pick up:\n\t${1:# Player picks up item}', documentation: "Triggered when a player picks up an item" },
        { label: "on player animation", insertText: 'on player animation:\n\t${1:# Player animation}', documentation: "Triggered when a player performs an animation" },
        { label: "on player recipe discover", insertText: 'on player recipe discover:\n\t${1:# Player discovers recipe}', documentation: "Triggered when a player discovers a recipe" },
        { label: "on prepare craft", insertText: 'on prepare craft:\n\t${1:# Crafting recipe prepared}', documentation: "Triggered when a crafting recipe is prepared" },
        { label: "on prepare enchant", insertText: 'on prepare enchant:\n\t${1:# Enchanting prepared}', documentation: "Triggered when enchanting is prepared" },
        { label: "on prepare smith", insertText: 'on prepare smith:\n\t${1:# Smithing prepared}', documentation: "Triggered when smithing is prepared" },
        { label: "on riptide", insertText: 'on riptide:\n\t${1:# Player uses riptide}', documentation: "Triggered when a player uses riptide enchantment" },
        { label: "on rightclick", insertText: 'on rightclick:\n\t${1:# Right click action}', documentation: "Triggered on right-click actions" },
        { label: "on right click", insertText: 'on right click:\n\t${1:# Right click action}', documentation: "Triggered on right-click actions" },
        { label: "on shear", insertText: 'on shear:\n\t${1:# Player shears entity}', documentation: "Triggered when a player shears an entity" },
        { label: "on sneak toggle", insertText: 'on sneak toggle:\n\t${1:# Player toggles sneak}', documentation: "Triggered when a player toggles sneak" },
        { label: "on sprint toggle", insertText: 'on sprint toggle:\n\t${1:# Player toggles sprint}', documentation: "Triggered when a player toggles sprint" },
        { label: "on swap hand items", insertText: 'on swap hand items:\n\t${1:# Player swaps hand items}', documentation: "Triggered when a player swaps hand items" },
        { label: "on teleport", insertText: 'on teleport:\n\t${1:# Entity teleports}', documentation: "Triggered when an entity teleports" },
        { label: "on tool change", insertText: 'on tool change:\n\t${1:# Player held item changes}', documentation: "Triggered when a player's held item changes" },

        // Entity Events
        { label: "on breed", insertText: 'on breed:\n\t${1:# Entities breed}', documentation: "Triggered when entities breed" },
        { label: "on combust", insertText: 'on combust:\n\t${1:# Entity starts burning}', documentation: "Triggered when an entity starts burning" },
        { label: "on creeper power", insertText: 'on creeper power:\n\t${1:# Creeper is powered}', documentation: "Triggered when a creeper is powered by lightning" },
        { label: "on entity block form", insertText: 'on entity block form:\n\t${1:# Entity forms block}', documentation: "Triggered when an entity forms a block" },
        { label: "on entity change block", insertText: 'on entity change block:\n\t${1:# Entity changes block}', documentation: "Triggered when an entity changes a block" },
        { label: "on entity place", insertText: 'on entity place:\n\t${1:# Entity places block}', documentation: "Triggered when an entity places a block" },
        { label: "on explode", insertText: 'on explode:\n\t${1:# Entity explodes}', documentation: "Triggered when an entity explodes" },
        { label: "on horse jump", insertText: 'on horse jump:\n\t${1:# Horse jumps}', documentation: "Triggered when a horse jumps" },
        { label: "on piglin barter", insertText: 'on piglin barter:\n\t${1:# Piglin barters}', documentation: "Triggered when a piglin barters" },
        { label: "on projectile hit", insertText: 'on projectile hit:\n\t${1:# Projectile hits something}', documentation: "Triggered when a projectile hits something" },
        { label: "on projectile launch", insertText: 'on projectile launch:\n\t${1:# Projectile is launched}', documentation: "Triggered when a projectile is launched" },
        { label: "on regain health", insertText: 'on regain health:\n\t${1:# Entity regains health}', documentation: "Triggered when an entity regains health" },
        { label: "on ride", insertText: 'on ride:\n\t${1:# Entity rides another}', documentation: "Triggered when an entity rides another" },
        { label: "on slime split", insertText: 'on slime split:\n\t${1:# Slime splits}', documentation: "Triggered when a slime splits" },
        { label: "on spawn", insertText: 'on spawn:\n\t${1:# Entity spawns}', documentation: "Triggered when an entity spawns" },
        { label: "on target", insertText: 'on target:\n\t${1:# Entity targets another}', documentation: "Triggered when an entity targets another" },
        { label: "on tame", insertText: 'on tame:\n\t${1:# Entity is tamed}', documentation: "Triggered when an entity is tamed" },
        { label: "on transform", insertText: 'on transform:\n\t${1:# Entity transforms}', documentation: "Triggered when an entity transforms" },
        { label: "on unleash", insertText: 'on unleash:\n\t${1:# Entity is unleashed}', documentation: "Triggered when an entity is unleashed" },
        { label: "on untarget", insertText: 'on untarget:\n\t${1:# Entity stops targeting}', documentation: "Triggered when an entity stops targeting" },

        // Block Events
        { label: "on block damage", insertText: 'on block damage:\n\t${1:# Block is damaged}', documentation: "Triggered when a block is damaged" },
        { label: "on break", insertText: 'on break:\n\t${1:# Block is broken}', documentation: "Triggered when a block is broken" },
        { label: "on mine", insertText: 'on mine:\n\t${1:# Block is mined}', documentation: "Triggered when a block is mined" },
        { label: "on burn", insertText: 'on burn:\n\t${1:# Block burns}', documentation: "Triggered when a block burns" },
        { label: "on can build check", insertText: 'on can build check:\n\t${1:# Build check}', documentation: "Triggered when checking if a player can build" },
        { label: "on decay", insertText: 'on decay:\n\t${1:# Block decays}', documentation: "Triggered when a block decays" },
        { label: "on fade", insertText: 'on fade:\n\t${1:# Block fades}', documentation: "Triggered when a block fades" },
        { label: "on fertilize", insertText: 'on fertilize:\n\t${1:# Player fertilizes block}', documentation: "Triggered when a player fertilizes a block" },
        { label: "on form", insertText: 'on form:\n\t${1:# Block forms}', documentation: "Triggered when a block forms" },
        { label: "on flow", insertText: 'on flow:\n\t${1:# Liquid flows}', documentation: "Triggered when a liquid flows" },
        { label: "on from to", insertText: 'on from to:\n\t${1:# Dragon egg teleports}', documentation: "Triggered when a dragon egg teleports" },
        { label: "on grow", insertText: 'on grow:\n\t${1:# Block grows}', documentation: "Triggered when a block grows" },
        { label: "on ignite", insertText: 'on ignite:\n\t${1:# Block is ignited}', documentation: "Triggered when a block is ignited" },
        { label: "on spread", insertText: 'on spread:\n\t${1:# Block spreads}', documentation: "Triggered when a block spreads" },
        { label: "on piston extend", insertText: 'on piston extend:\n\t${1:# Piston extends}', documentation: "Triggered when a piston extends" },
        { label: "on piston retract", insertText: 'on piston retract:\n\t${1:# Piston retracts}', documentation: "Triggered when a piston retracts" },
        { label: "on place", insertText: 'on place:\n\t${1:# Block is placed}', documentation: "Triggered when a block is placed" },
        { label: "on physics", insertText: 'on physics:\n\t${1:# Block physics update}', documentation: "Triggered for block physics updates" },
        { label: "on redstone", insertText: 'on redstone:\n\t${1:# Redstone current changes}', documentation: "Triggered when redstone current changes" },
        { label: "on sign change", insertText: 'on sign change:\n\t${1:# Sign is edited}', documentation: "Triggered when a sign is edited" },
        { label: "on sponge absorb", insertText: 'on sponge absorb:\n\t${1:# Sponge absorbs water}', documentation: "Triggered when a sponge absorbs water" },
        { label: "on structure grow", insertText: 'on structure grow:\n\t${1:# Structure grows}', documentation: "Triggered when a structure grows" },

        // Inventory Events
        { label: "on book edit", insertText: 'on book edit:\n\t${1:# Book is edited}', documentation: "Triggered when a book is edited" },
        { label: "on book sign", insertText: 'on book sign:\n\t${1:# Book is signed}', documentation: "Triggered when a book is signed" },
        { label: "on enchant", insertText: 'on enchant:\n\t${1:# Item is enchanted}', documentation: "Triggered when an item is enchanted" },
        { label: "on enchant prepare", insertText: 'on enchant prepare:\n\t${1:# Enchanting prepared}', documentation: "Triggered when enchanting is prepared" },
        { label: "on furnace burn", insertText: 'on furnace burn:\n\t${1:# Fuel burns in furnace}', documentation: "Triggered when fuel burns in a furnace" },
        { label: "on furnace smelt", insertText: 'on furnace smelt:\n\t${1:# Item is smelted}', documentation: "Triggered when an item is smelted" },
        { label: "on inventory click", insertText: 'on inventory click:\n\t${1:# Player clicks inventory}', documentation: "Triggered when a player clicks in an inventory" },
        { label: "on inventory close", insertText: 'on inventory close:\n\t${1:# Inventory is closed}', documentation: "Triggered when an inventory is closed" },
        { label: "on inventory open", insertText: 'on inventory open:\n\t${1:# Inventory is opened}', documentation: "Triggered when an inventory is opened" },
        { label: "on inventory pick up", insertText: 'on inventory pick up:\n\t${1:# Inventory picks up item}', documentation: "Triggered when an inventory picks up an item" },
        { label: "on item despawn", insertText: 'on item despawn:\n\t${1:# Item despawns}', documentation: "Triggered when an item despawns" },
        { label: "on item merge", insertText: 'on item merge:\n\t${1:# Items merge}', documentation: "Triggered when items merge" },
        { label: "on item spawn", insertText: 'on item spawn:\n\t${1:# Item spawns}', documentation: "Triggered when an item spawns" },
        { label: "on smith", insertText: 'on smith:\n\t${1:# Item is smithed}', documentation: "Triggered when an item is smithed" },

        // World Events
        { label: "on lightning", insertText: 'on lightning:\n\t${1:# Lightning strikes}', documentation: "Triggered when lightning strikes" },
        { label: "on portal", insertText: 'on portal:\n\t${1:# Entity uses portal}', documentation: "Triggered when an entity uses a portal" },
        { label: "on portal create", insertText: 'on portal create:\n\t${1:# Portal is created}', documentation: "Triggered when a portal is created" },
        { label: "on portal enter", insertText: 'on portal enter:\n\t${1:# Entity enters portal}', documentation: "Triggered when an entity enters a portal block" },
        { label: "on spawn change", insertText: 'on spawn change:\n\t${1:# World spawn changes}', documentation: "Triggered when the world spawn changes" },
        { label: "on thunder change", insertText: 'on thunder change:\n\t${1:# Thunder state changes}', documentation: "Triggered when thunder state changes" },
        { label: "on weather change", insertText: 'on weather change:\n\t${1:# Weather changes}', documentation: "Triggered when weather changes" },

        // Server Events
        { label: "on server ping", insertText: 'on server ping:\n\t${1:# Server is pinged}', documentation: "Triggered when the server is pinged for list info" },
        { label: "on server list ping", insertText: 'on server list ping:\n\t${1:# Server list ping}', documentation: "Triggered when the server is pinged for list info" },
        { label: "on tab complete", insertText: 'on tab complete:\n\t${1:# Tab completion requested}', documentation: "Triggered when tab completion is requested" },
        { label: "on script load", insertText: 'on script load:\n\t${1:# Script is loaded}', documentation: "Triggered when a script is loaded" },
        { label: "on script unload", insertText: 'on script unload:\n\t${1:# Script is unloaded}', documentation: "Triggered when a script is unloaded" },
        { label: "on server load", insertText: 'on server load:\n\t${1:# Server starts}', documentation: "Triggered when the server starts" },
        { label: "on server stop", insertText: 'on server stop:\n\t${1:# Server stops}', documentation: "Triggered when the server stops" },

        // Vehicle Events
        { label: "on vehicle create", insertText: 'on vehicle create:\n\t${1:# Vehicle is created}', documentation: "Triggered when a vehicle is created" },
        { label: "on vehicle damage", insertText: 'on vehicle damage:\n\t${1:# Vehicle is damaged}', documentation: "Triggered when a vehicle is damaged" },
        { label: "on vehicle destroy", insertText: 'on vehicle destroy:\n\t${1:# Vehicle is destroyed}', documentation: "Triggered when a vehicle is destroyed" },
        { label: "on vehicle enter", insertText: 'on vehicle enter:\n\t${1:# Entity enters vehicle}', documentation: "Triggered when an entity enters a vehicle" },
        { label: "on vehicle exit", insertText: 'on vehicle exit:\n\t${1:# Entity exits vehicle}', documentation: "Triggered when an entity exits a vehicle" },
        { label: "on vehicle move", insertText: 'on vehicle move:\n\t${1:# Vehicle moves}', documentation: "Triggered when a vehicle moves" },
        { label: "on vehicle collide", insertText: 'on vehicle collide:\n\t${1:# Vehicle collides}', documentation: "Triggered when a vehicle collides with an entity" },

        // Other Events
        { label: "on chunk populate", insertText: 'on chunk populate:\n\t${1:# Chunk is populated}', documentation: "Triggered when a chunk is populated" },
        { label: "on chunk generate", insertText: 'on chunk generate:\n\t${1:# Chunk is generated}', documentation: "Triggered when a chunk is populated" },
        { label: "on chunk load", insertText: 'on chunk load:\n\t${1:# Chunk loads}', documentation: "Triggered when a chunk loads" },
        { label: "on chunk unload", insertText: 'on chunk unload:\n\t${1:# Chunk unloads}', documentation: "Triggered when a chunk unloads" },
        { label: "on command pre process", insertText: 'on command pre process:\n\t${1:# Before command processed}', documentation: "Triggered before a command is processed" },
        { label: "on hanging break", insertText: 'on hanging break:\n\t${1:# Hanging entity breaks}', documentation: "Triggered when a hanging entity breaks" },
        { label: "on hanging place", insertText: 'on hanging place:\n\t${1:# Hanging entity placed}', documentation: "Triggered when a hanging entity is placed" },
        { label: "on loot generate", insertText: 'on loot generate:\n\t${1:# Loot is generated}', documentation: "Triggered when loot is generated" },
        { label: "on note play", insertText: 'on note play:\n\t${1:# Note block plays}', documentation: "Triggered when a note block plays" },
        { label: "on player statistic increment", insertText: 'on player statistic increment:\n\t${1:# Player statistic increases}', documentation: "Triggered when a player's statistic increases" },
        { label: "on pressure", insertText: 'on pressure:\n\t${1:# Pressure plate activated}', documentation: "Triggered when a pressure plate is activated" },
        { label: "on tripwire", insertText: 'on tripwire:\n\t${1:# Tripwire activated}', documentation: "Triggered when a tripwire is activated" },

        // SkBee Events
        { label: "on armor stand manipulate", insertText: 'on armor stand manipulate:\n\t${1:# Armor stand manipulated}', documentation: "SkBee: Triggered when a player manipulates an armor stand" },
        { label: "on armor change", insertText: 'on armor change:\n\t${1:# Entity armor changes}', documentation: "SkBee: Triggered when an entity's armor changes" },
        { label: "on bee breed", insertText: 'on bee breed:\n\t${1:# Bees breed}', documentation: "SkBee: Triggered when bees breed" },
        { label: "on bee enter hive", insertText: 'on bee enter hive:\n\t${1:# Bee enters hive}', documentation: "SkBee: Triggered when a bee enters its hive" },
        { label: "on bee leave hive", insertText: 'on bee leave hive:\n\t${1:# Bee leaves hive}', documentation: "SkBee: Triggered when a bee leaves its hive" },
        { label: "on bee pollinate", insertText: 'on bee pollinate:\n\t${1:# Bee pollinates flower}', documentation: "SkBee: Triggered when a bee pollinates a flower" },
        { label: "on bound create", insertText: 'on bound create:\n\t${1:# Bound is created}', documentation: "SkBee: Triggered when a bound (custom region) is created" },
        { label: "on bound enter", insertText: 'on bound enter:\n\t${1:# Entity enters bound}', documentation: "SkBee: Triggered when an entity enters a bound" },
        { label: "on bound exit", insertText: 'on bound exit:\n\t${1:# Entity exits bound}', documentation: "SkBee: Triggered when an entity exits a bound" },
        { label: "on brush", insertText: 'on brush:\n\t${1:# Player uses brush}', documentation: "SkBee: Triggered when a player uses a brush on a suspicious block" },
        { label: "on camel dash", insertText: 'on camel dash:\n\t${1:# Camel dashes}', documentation: "SkBee: Triggered when a camel dashes" },
        { label: "on calibrated sculk sensor resonate", insertText: 'on calibrated sculk sensor resonate:\n\t${1:# Sculk sensor resonates}', documentation: "SkBee: Triggered when a calibrated sculk sensor resonates" },
        { label: "on chiseled bookshelf book place", insertText: 'on chiseled bookshelf book place:\n\t${1:# Book placed in bookshelf}', documentation: "SkBee: Triggered when a book is placed in a chiseled bookshelf" },
        { label: "on chiseled bookshelf book take", insertText: 'on chiseled bookshelf book take:\n\t${1:# Book taken from bookshelf}', documentation: "SkBee: Triggered when a book is taken from a chiseled bookshelf" },
        { label: "on chiseled bookshelf search", insertText: 'on chiseled bookshelf search:\n\t${1:# Bookshelf searched}', documentation: "SkBee: Triggered when searching a chiseled bookshelf" },
        { label: "on custom drop", insertText: 'on custom drop:\n\t${1:# Custom drop occurs}', documentation: "SkBee: Triggered when a custom drop occurs" },
        { label: "on custom item craft", insertText: 'on custom item craft:\n\t${1:# Custom item crafted}', documentation: "SkBee: Triggered when a custom item is crafted" },
        { label: "on custom recipe discover", insertText: 'on custom recipe discover:\n\t${1:# Custom recipe discovered}', documentation: "SkBee: Triggered when a player discovers a custom recipe" },
        { label: "on hanging sign edit", insertText: 'on hanging sign edit:\n\t${1:# Hanging sign edited}', documentation: "SkBee: Triggered when a hanging sign is edited" },
        { label: "on nbt compound add", insertText: 'on nbt compound add:\n\t${1:# NBT added}', documentation: "SkBee: Triggered when NBT is added to an item/entity" },
        { label: "on nbt compound remove", insertText: 'on nbt compound remove:\n\t${1:# NBT removed}', documentation: "SkBee: Triggered when NBT is removed from an item/entity" },
        { label: "on ocelot attack", insertText: 'on ocelot attack:\n\t${1:# Ocelot attacks}', documentation: "SkBee: Triggered when an ocelot attacks" },
        { label: "on particle spawn", insertText: 'on particle spawn:\n\t${1:# Particle spawns}', documentation: "SkBee: Triggered when a particle is spawned" },
        { label: "on scoreboard objective create", insertText: 'on scoreboard objective create:\n\t${1:# Scoreboard objective created}', documentation: "SkBee: Triggered when a scoreboard objective is created" },
        { label: "on scoreboard objective remove", insertText: 'on scoreboard objective remove:\n\t${1:# Scoreboard objective removed}', documentation: "SkBee: Triggered when a scoreboard objective is removed" },
        { label: "on scoreboard score set", insertText: 'on scoreboard score set:\n\t${1:# Scoreboard score set}', documentation: "SkBee: Triggered when a scoreboard score is set" },
        { label: "on scoreboard score reset", insertText: 'on scoreboard score reset:\n\t${1:# Scoreboard score reset}', documentation: "SkBee: Triggered when a scoreboard score is reset" },
        { label: "on sniffer dig", insertText: 'on sniffer dig:\n\t${1:# Sniffer digs}', documentation: "SkBee: Triggered when a sniffer digs" },
        { label: "on sniffer egg hatch", insertText: 'on sniffer egg hatch:\n\t${1:# Sniffer egg hatches}', documentation: "SkBee: Triggered when a sniffer egg hatches" },
        { label: "on sniffer explore", insertText: 'on sniffer explore:\n\t${1:# Sniffer explores}', documentation: "SkBee: Triggered when a sniffer explores" },
        { label: "on strider shiver", insertText: 'on strider shiver:\n\t${1:# Strider shivers}', documentation: "SkBee: Triggered when a strider shivers" },
        { label: "on ticket acquire", insertText: 'on ticket acquire:\n\t${1:# Chunk ticket acquired}', documentation: "SkBee: Triggered when a chunk ticket is acquired" },
        { label: "on virtual furnace smelt", insertText: 'on virtual furnace smelt:\n\t${1:# Virtual furnace smelts}', documentation: "SkBee: Triggered when a virtual furnace smelts an item" },
        { label: "on villager career change", insertText: 'on villager career change:\n\t${1:# Villager changes career}', documentation: "SkBee: Triggered when a villager changes career" },
        { label: "on wandering trader spawn", insertText: 'on wandering trader spawn:\n\t${1:# Wandering trader spawns}', documentation: "SkBee: Triggered when a wandering trader spawns" },
        { label: "on world creator", insertText: 'on world creator:\n\t${1:# World created}', documentation: "SkBee: Triggered when a world is created using SkBee's world creator" },

        // SkQuery Events
        { label: "on region enter", insertText: 'on region enter:\n\t${1:# Player enters WorldGuard region}', documentation: "SkQuery: Triggered when a player enters a WorldGuard region" },
        { label: "on region exit", insertText: 'on region exit:\n\t${1:# Player exits WorldGuard region}', documentation: "SkQuery: Triggered when a player exits a WorldGuard region" },
        { label: "on region change", insertText: 'on region change:\n\t${1:# Player region set changes}', documentation: "SkQuery: Triggered when a player's region set changes" },
        { label: "on region border", insertText: 'on region border:\n\t${1:# Player at region border}', documentation: "SkQuery: Triggered when a player is at the border of a region" },
        { label: "on anvil", insertText: 'on anvil:\n\t${1:# Player uses anvil}', documentation: "SkQuery: Triggered when a player uses an anvil" },
        { label: "on skquery enable", insertText: 'on skquery enable:\n\t${1:# SkQuery enabled}', documentation: "SkQuery: Triggered when SkQuery is enabled" },
        { label: "on skquery disable", insertText: 'on skquery disable:\n\t${1:# SkQuery disabled}', documentation: "SkQuery: Triggered when SkQuery is disabled" },
        { label: "on script start", insertText: 'on script start:\n\t${1:# Script starts}', documentation: "SkQuery: Triggered when any script starts" },
        { label: "on script stop", insertText: 'on script stop:\n\t${1:# Script stops}', documentation: "SkQuery: Triggered when any script stops" },
        { label: "on connect", insertText: 'on connect:\n\t${1:# Player connects}', documentation: "SkQuery: Triggered when a player connects (pre-login)" },
        { label: "on motd request", insertText: 'on motd request:\n\t${1:# MOTD requested}', documentation: "SkQuery: Triggered on server MOTD request" },
        { label: "on ping", insertText: 'on ping:\n\t${1:# Server pinged}', documentation: "SkQuery: Triggered on server ping" },

        // Skript GUI Events
        { label: "on gui click", insertText: 'on gui click:\n\t${1:# Player clicks GUI slot}', documentation: "Skript-GUI: Triggered when a player clicks a slot in a GUI" },
        { label: "on gui open", insertText: 'on gui open:\n\t${1:# Player opens GUI}', documentation: "Skript-GUI: Triggered when a player opens a GUI" },
        { label: "on gui close", insertText: 'on gui close:\n\t${1:# Player closes GUI}', documentation: "Skript-GUI: Triggered when a player closes a GUI" },
        { label: "on gui slot change", insertText: 'on gui slot change:\n\t${1:# GUI slot changes}', documentation: "Skript-GUI: Triggered when a slot in a GUI changes" },

        // skript-yaml Events
        { label: "on yaml load", insertText: 'on yaml load:\n\t${1:# YAML file loaded}', documentation: "skript-yaml: Triggered when a YAML file is loaded" },
        { label: "on yaml loading", insertText: 'on yaml loading:\n\t${1:# YAML file loading}', documentation: "skript-yaml: Triggered when a YAML file is loading" },
        { label: "on yaml value change", insertText: 'on yaml value change:\n\t${1:# YAML value changes}', documentation: "skript-yaml: Triggered when a YAML value changes" },
      ];

      const structureSnippets = [
        // Structure snippets
        { label: "command", insertText: 'command /${1:name}:\n\ttrigger:\n\t\t${2:# Your command code here}', documentation: "Skript command template with proper indentation" },
        { label: "if", insertText: 'if ${1:condition}:\n\t${2:# Action here}', documentation: "If statement with proper indentation" },
        { label: "loop", insertText: 'loop ${1:times}:\n\t${2:# Loop code here}', documentation: "Loop statement with proper indentation" },
        { label: "function", insertText: 'function ${1:name}(${2:parameters}):\n\t${3:# Function code here}', documentation: "Function definition with proper indentation" },
      ];

      const snippets = [...eventSnippets, ...structureSnippets].map(snippet => ({
        ...snippet,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      }));
      monaco.languages.registerCompletionItemProvider("skript", {
        triggerCharacters: ["/", " ", "\n"],
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const keywordSuggestions = keywords.map((k) => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range,
          }));
          const snippetSuggestions = snippets.map((s) => ({ ...s, range }));
          return { suggestions: [...snippetSuggestions, ...keywordSuggestions] };
        },
      });
    }

    monaco.editor.defineTheme("skriptpanda-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "ff9800" },
        { token: "event", foreground: "7aa2f7" },
        { token: "type", foreground: "7aa2f7" },
        { token: "string", foreground: "9cdcfe" },
        { token: "comment", foreground: "6a9955" },
        { token: "number", foreground: "b5cea8" },
        { token: "colon", foreground: "ff9800" },
      ],
      colors: {
        "editor.background": "#0b1020",
        "editorLineNumber.foreground": "#5a6b8a",
        "editorCursor.foreground": "#ff9800",
        "editor.selectionBackground": "#264f78",
      },
    });

    monaco.editor.defineTheme("skriptpanda-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "d97706" },
        { token: "event", foreground: "0f4c75" },
        { token: "type", foreground: "0f4c75" },
        { token: "string", foreground: "059669" },
        { token: "comment", foreground: "6b7280" },
        { token: "number", foreground: "7c3aed" },
        { token: "colon", foreground: "ff9800" },
      ],
      colors: {
        "editorCursor.foreground": "#ff9800",
        "editor.background": "#fefefe",
        "editorLineNumber.foreground": "#9ca3af",
      },
    });

    monaco.editor.defineTheme("dracula", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "ff79c6" }, // Pink
        { token: "event", foreground: "8be9fd" }, // Cyan
        { token: "type", foreground: "8be9fd" }, // Cyan
        { token: "string", foreground: "f1fa8c" }, // Yellow
        { token: "comment", foreground: "6272a4" }, // Purple-gray
        { token: "number", foreground: "bd93f9" }, // Purple
        { token: "colon", foreground: "ff79c6" }, // Pink
      ],
      colors: {
        "editor.background": "#282a36",
        "editorLineNumber.foreground": "#6272a4",
        "editorCursor.foreground": "#f8f8f2",
        "editor.selectionBackground": "#44475a",
        "editor.foreground": "#f8f8f2",
      },
    });

    monaco.editor.defineTheme("solarized-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "859900" }, // Green
        { token: "event", foreground: "268bd2" }, // Blue
        { token: "type", foreground: "268bd2" }, // Blue
        { token: "string", foreground: "2aa198" }, // Cyan
        { token: "comment", foreground: "93a1a1" }, // Base1
        { token: "number", foreground: "d33682" }, // Magenta
        { token: "colon", foreground: "cb4b16" }, // Orange
      ],
      colors: {
        "editor.background": "#fdf6e3",
        "editorLineNumber.foreground": "#93a1a1",
        "editorCursor.foreground": "#657b83",
        "editor.selectionBackground": "#eee8d5",
        "editor.foreground": "#657b83",
      },
    });
  };

  const onMount: OnMount = (editor, monaco) => {
    monacoRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({ line: e.position.lineNumber, column: e.position.column });
    });
  };

  useEffect(() => {
    return () => {
      monacoRef.current?.dispose();
    };
  }, []);

  const value = file?.content ?? "";

  return (
    <div className="h-full w-full overflow-hidden" style={{ overscrollBehavior: 'contain' }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        beforeMount={beforeMount}
        onMount={onMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          smoothScrolling: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
        theme={getMonacoTheme(themeKey)}
      />
    </div>
  );
}
