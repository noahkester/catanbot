console.log("Content script loaded!");

// Only declare constants if they don't already exist
if (typeof BUILDING === 'undefined') {
  const BUILDING = {
    devCard: "devCard",
    road: "road",
    settlement: "settlement",
    city: "city",
  }
  window.BUILDING = BUILDING;
}

if (typeof RESOURCES === 'undefined') {
  const RESOURCES = {
    brick: "brick",
    wood: "wood",
    ore: "ore",
    sheep: "sheep",
    wheat: "wheat",
    unknown: "unknown"
  }
  window.RESOURCES = RESOURCES;
}

if (typeof RESOURCE_FILES === 'undefined') {
  const RESOURCE_FILES = {
    brick: {
      "file": "/assets/brick_icon-6e50c158.svg",
      "color": "rgb(241, 150, 43)"
    },
    wood: {
      "file": "/assets/wood_icon-6e8f54af.svg",
      "color": "rgb(144, 171, 79)"
    },
    ore: {
      "file": "/assets/ore_icon-d136f00c.svg",
      "color": "rgb(188, 187, 172)"
    },
    sheep: {
      "file": "/assets/sheep_icon-fa0e14bf.svg",
      "color": "rgb(188, 206, 21)"
    },
    wheat: {
      "file": "/assets/wheat_icon-ece490c6.svg",
      "color": "rgb(232, 207, 51)"
    },
    unknown: {
      "file": "/assets/unknown_icon-24d226d5.svg",
      "color": "rgb(188, 187, 172)"
    }
  }
  window.RESOURCE_FILES = RESOURCE_FILES;
}

if (typeof ACTIONS === 'undefined') {
  const ACTIONS = {
    build: "build",
    trade: "trade",
    steal: "steal",
    receive: "receive",
    discard: "discard"
  }
  window.ACTIONS = ACTIONS;
}

if (typeof combineResourceObjects === 'undefined') {
  function combineResourceObjects(r1, r2) {
    for (const [resource, count] of Object.entries(r2)) {
      if (!(resource in r1)) {
        r1[resource] = 0
      }
      r1[resource] += count
    }
    return r1
  }
  window.combineResourceObjects = combineResourceObjects
}

if (typeof resourceCount === 'undefined') {
  function resourceCount(resources, negative = false) {
    let map = {};
    resources.forEach(resource => {
      if (!(resource in map)) {
        map[resource] = 0;
      }
      if (negative) {
        map[resource] -= 1;
      }
      else {
        map[resource] += 1;
      }
    })
    return map;
  }
  window.resourceCount = resourceCount
}

// Only declare class if it doesn't already exist
if (typeof CatanEvent === 'undefined') {
  class CatanEvent {
    constructor(action, player, resourceGroups, otherPlayers, building) {
      this.action = action;
      this.player = player;
      this.resourceGroups = resourceGroups;
      this.otherPlayers = otherPlayers;
      this.building = building;
    }

    calcResourceDelta() {
      if (this.action == ACTIONS.build) {
        if (this.building == BUILDING.devCard) {
          return {
            [this.player]: {
              [RESOURCES.wheat]: -1,
              [RESOURCES.sheep]: -1,
              [RESOURCES.ore]: -1
            }
          }
        }
        else if (this.building == BUILDING.road) {
          return {
            [this.player]: {
              [RESOURCES.wood]: -1,
              [RESOURCES.brick]: -1
            }
          }
        }
        else if (this.building == BUILDING.settlement) {
          return {
            [this.player]: {
              [RESOURCES.wheat]: -1,
              [RESOURCES.sheep]: -1,
              [RESOURCES.brick]: -1,
              [RESOURCES.wood]: -1
            }
          }
        }
        else if (this.building == BUILDING.city) {
          return {
            [this.player]: {
              [RESOURCES.wheat]: -2,
              [RESOURCES.ore]: -3
            }
          }
        }
      }
      else if (this.action == ACTIONS.receive) {
        return {
          [this.player]: resourceCount(this.resourceGroups[0])
        }
      }
      else if (this.action == ACTIONS.steal) {
        if (this.resourceGroups[0][0] == "unknown") {
          return {
            [this.player]: {"unknown": 1},
            [this.otherPlayers[0]]: {"unknown": -1}
          }
        }
        let stealDelta = {}
        let i = 0
        this.otherPlayers.forEach(player => {
          stealDelta[player] = resourceCount(this.resourceGroups[i], true)
          i += 1
        })
        let playerGained = {}
        this.resourceGroups.forEach(resources => {
          playerGained = combineResourceObjects(playerGained, resourceCount(resources))
        })
        stealDelta[this.player] = playerGained
        return stealDelta
      }
      else if (this.action == ACTIONS.trade) {
        return {
          [this.player]: combineResourceObjects(resourceCount(this.resourceGroups[1]), resourceCount(this.resourceGroups[0], true)),
          [this.otherPlayers[0]]: combineResourceObjects(resourceCount(this.resourceGroups[0]), resourceCount(this.resourceGroups[1], true)),
        }
      }
      else if (this.action == ACTIONS.discard) {
        return {
          [this.player]: resourceCount(this.resourceGroups[0], true)
        }
      }
      return {}
    }
  }
  window.CatanEvent = CatanEvent;
}

// Only declare functions if they don't already exist
if (typeof createCatanEvent === 'undefined') {
  function createCatanEvent(element) {
    // Filter out event messages that are not relevant
    const filteredStrings = [
      "ends turn",
      "separator",
      "Placement",
      "rolled",
      "moved", // robber
      "resigns",
      "played a Knight",
      "played road builder",
      "played year of plenty",
      "took longest road",
      "took largest army" // todo: confirm this text, had to guess
    ]
    
    for (const filteredString of filteredStrings) {
      if (element.outerHTML.includes(filteredString)) {
        if (debug && element.outerHTML.includes("Turn")) {
          const text = element.querySelector(".dividerText").innerHTML;
          console.log(text)
        }
        return;
      }
    }
    let action = "";
    let player = "";
    let resourceGroups = [];
    let otherPlayers = [];
    let building = "";
    
    count = 0
    resources = []
    for (const component of element.children) {
      count += 1
      // Player
      if (component.textContent.includes("to the bank")) {
        otherPlayers.push("bank")
        if (resources.length > 0) {
          resourceGroups.push(resources)
        }
        resources = []
      }
      else if (component.classList.contains("playerName")) {
        // first playerName will always be the player
        if (player == "") {
          player = component.textContent
        }
        else {
          otherPlayers.push(component.textContent)
        }
        if (resources.length > 0) {
          resourceGroups.push(resources)
        }
        resources = []
      }
      // Actions
      else if (component.textContent.includes("built") || component.textContent.includes("bought")) {
        action = ACTIONS.build;
      }
      else if (component.textContent.includes("received")) {
        action = ACTIONS.receive;
      }
      else if (component.textContent.includes("and stole")) {
        // Note: monopoloy is handled as a "steal" but remove the resource icon we previously collected
        action = ACTIONS.steal;
        resources = []
      }
      else if (component.textContent.includes("stole")) {
        action = ACTIONS.steal;
      }
      else if (component.textContent.includes("traded")) {
        action = ACTIONS.trade;
      }
      else if (component.textContent.includes("discarded")) {
        action = ACTIONS.discard;
      }
      // Buildings
      else if (component.outerHTML.includes("settlement")) {
        building = BUILDING.settlement;
      }
      else if (component.outerHTML.includes("road")) {
        building = BUILDING.road;
      }
      else if (component.outerHTML.includes("city")) {
        building = BUILDING.city;
      }
      else if (component.outerHTML.includes("devcards")) {
        building = BUILDING.devCard;
      }
      // Resources
      else if (component.outerHTML.includes("brick")) {
        resources.push(RESOURCES.brick)
      }
      else if (component.outerHTML.includes("wood")) {
        resources.push(RESOURCES.wood)
      }
      else if (component.outerHTML.includes("sheep")) {
        resources.push(RESOURCES.sheep)
      }
      else if (component.outerHTML.includes("wheat")) {
        resources.push(RESOURCES.wheat)
      }
      else if (component.outerHTML.includes("ore")) {
        resources.push(RESOURCES.ore)
      }
      else if (component.outerHTML.includes("unknown_icon")) {
        resources.push("unknown")
      }
    }
    if (resources.length > 0) {
      resourceGroups.push(resources)
    }
    const event = new CatanEvent(
      action,
      player,
      resourceGroups,
      otherPlayers,
      building
    )
    if (debug) {
      console.log("Event:", event)
      console.log("ResourceDelta:", event.calcResourceDelta())
    }
    return event
  }
  window.createCatanEvent = createCatanEvent;
}

if (typeof addResourceDelta === 'undefined') {
  function addResourceDelta(resources, resourceDelta) {
    for (const [player, delta] of Object.entries(resourceDelta)) {
      if (player == "bank") {
        // ignore the bank
        continue
      }
      if (!(player in resources)) {
        resources[player] = {
          brick: 0,
          wood: 0,
          ore: 0,
          sheep: 0,
          wheat: 0,
          unknown: 0,
        }
      }
      for (const [resource, count] of Object.entries(delta)) {
        // this player lost an unknown resource, just subtract from all resources and add to unknown
        if (resource == "unknown" && count == -1) {
          subtracted_count = 0
          for (const [resource2, count2] of Object.entries(resources[player])) {
            if (resource2 != "unknown" && count2 > 0) {
              resources[player][resource2] -= 1
              subtracted_count += 1
            }
          }
          resources[player]["unknown"] += (subtracted_count - 1)
          // note: if unknown resource is stolen, there will only be 1 delta in this loop
          break
        }

        resources[player][resource] += count
        // Note: this is done to account for unknown steals.
        let escape = 10
        while (resources[player][resource] < 0) {
          resources[player]["unknown"] -= 1
          resources[player][resource] += 1
          escape -= 1
          if (escape < 0) {
            break
          }
        }
        if (resources[player]["unknown"] < 0) {
          console.log("unknown problem!")
        }
      }
    }
    return resources
  }
  window.addResourceDelta = addResourceDelta;
}

if (typeof calculateResources === 'undefined') {
  function calculateResources(resources, events) {
    for (const event of events) {
      let resourceDelta = event.calcResourceDelta()
      // check for unknown resource deltas

      resources = addResourceDelta(resources, resourceDelta)
    }
    return resources
  }
  window.calculateResources = calculateResources;
}

if (typeof getPlayerNames === 'undefined') {
  function getPlayerNames() {
    names = []
    const elements = document.querySelectorAll(".scoreName")
    elements.forEach(el => {
      // Player names are nested in the link to their profile while bots aren't
      const link = el.querySelector("a");
      if (link) {
        names.push(link.innerHTML);
      }
      else {
        names.push(el.lastChild.textContent.trim())
      }
    });
    if (debug) {
      console.log("Players found:", names)
    }
    return names
  }
  window.getPlayerNames = getPlayerNames;
}

if (typeof generateHTMLforResources === 'undefined') {
  function generateHTMLforResources(resources) {
    const size = 35;
    const smallSize = 24;
    const smallFontSize = 18
    resourceHTML = "";
    const orderedResources = ["wood", "brick", "sheep", "wheat", "ore", "unknown"]
    orderedResources.forEach(resource => {
      countHTML = ""
      if (resource in resources) {
        countHTML = `<div style="position: absolute; font-size: ${smallFontSize}px; text-align: center; left: 50%; bottom: 0; width: ${smallSize}px; height: ${smallSize}px; transform: translate(-50%, 50%); display: flex; justify-content: center; background-color: rgb(30, 31, 34); border-radius: 50%; line-height: 140%; opacity: 1; z-index: 2; border: 2px solid ${RESOURCE_FILES[resource]["color"]};">${resources[resource]}</div>`
      }
      else {
        console.log("Missing resource in resources", resource, resources)
      }
      resourceHTML += `
        <div class="resourceTradeIcon" style="position: relative; width: ${size}px; height: ${size}px; margin: 10px 0px 10px ${(resource == "wood") ? 20 : 0}px;">
          <div aria-label="" class="" style="position: relative;">
            <img id="res-1" src="${RESOURCE_FILES[resource]["file"]}" style="height: ${size}px; top: 0px; left: 0px; position: absolute; opacity: 1;">
          </div>
          ${countHTML}
        </div>`
    })
    styledResourcesHTML = `<div id="injected-resources" style="display: flex; position: relative; padding: 1% 0px; height: 100%; width: 100%; bottom: 0px;">${resourceHTML}</div>`
    return styledResourcesHTML
  }
  window.generateHTMLforResources = generateHTMLforResources;
}

if (typeof injectResourceHTML === 'undefined') {
  function injectResourceHTML(resources) {
    const scorePanels = document.querySelector('#score-panels');
    if (!scorePanels) {
      console.log('Score panels element not found');
      return;
    }
    
    // Remove any existing injected-resources elements from the entire page
    const existingInjectedResources = document.querySelectorAll('#injected-resources');
    existingInjectedResources.forEach(element => element.remove());
    
    // Get the first child of score-panels
    const nestedDiv1 = scorePanels.firstElementChild;
    if (!nestedDiv1) {
      return;
    }  
    
    // Print out all children of the first child
    for (let i = 0; i < nestedDiv1.children.length; i++) {
      const nestedDiv2 = nestedDiv1.children[i].firstElementChild; // id = score-red
      if (!nestedDiv2) {
        return
      }
      
      // Clear any previously injected resource HTML
      const existingResourceDivs = nestedDiv2.querySelectorAll('.resourceTradeIcon');
      existingResourceDivs.forEach(div => div.remove());
      
      // Find the player name from the .scoreName element
      const scoreNameElement = nestedDiv2.querySelector('.scoreName');
      if (scoreNameElement) {
        let playerName = '';
        const link = scoreNameElement.querySelector("a");
        if (link) {
          // Player names are nested in the link to their profile while bots aren't
          playerName = link.innerHTML;
        } else {
          playerName = scoreNameElement.lastChild.textContent.trim();
        }
        if (!(playerName in resources)) {
          console.log("Could not find player in resources", playerName)
          continue
        }
        resourceHTML = generateHTMLforResources(resources[playerName])
        nestedDiv2.insertAdjacentHTML('beforeend', resourceHTML);
      }
    }
  }
  window.injectResourceHTML = injectResourceHTML;
}

// Set debug flag
debug = true;

var playerResources = {};

function run() {
  let resources = {}

  playerNames = getPlayerNames()
  for (playerName of playerNames) {
    // All players start out with these resources to "build" their starting settlements and raods
    resources[playerName] = {
      brick: 4,
      wood: 4,
      ore: 0,
      sheep: 2,
      wheat: 2,
      unknown: 0
    }
  }

  const eventMsgs = document.querySelectorAll(".eventsTab .eventMsg");
  let events = []
  for (const event of eventMsgs) {
    let catanEvent = createCatanEvent(event)
    if (catanEvent) {
      events.push(catanEvent);
    }
  }

  resources = calculateResources(resources, events)
  console.log("Final resources count: \n", resources)
  // Wait a bit for the DOM to be fully loaded, then inject HTML
  setTimeout(() => {
    injectResourceHTML(resources);
  }, 1000);
}

run()