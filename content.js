console.log("Content script loaded!");

// Only declare constants if they don't already exist
if (typeof BUILDING === 'undefined') {
  const BUILDING = {
    developmentCard: "developmentCard",
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
  }
  window.ACTIONS = ACTIONS;
}

// Only declare class if it doesn't already exist
if (typeof CatanEvent === 'undefined') {
  class CatanEvent {
    constructor(action, actionPlayer, targetPlayers, resources, building) {
      this.action = action;
      this.actionPlayer = actionPlayer;
      this.targetPlayers = targetPlayers;
      this.resources = resources;
      this.building = building;
    }
    
    getResourceObject(negative = false) {
      let map = {};
      for (const resource of this.resources) {
        if (!(resource in map)) {
          map[resource] = 0;
        }
        if (negative) {
          map[resource] -= 1;
        }
        else {
          map[resource] += 1;
        }
      }
      return map;
    }

    calcResourceDelta() {
      if (this.action == ACTIONS.build) {
        if (this.building == BUILDING.developmentCard) {
          return {
            [this.actionPlayer]: {
              [RESOURCES.wheat]: -1,
              [RESOURCES.sheep]: -1,
              [RESOURCES.ore]: -1
            }
          }
        }
        else if (this.building == BUILDING.road) {
          return {
            [this.actionPlayer]: {
              [RESOURCES.wood]: -1,
              [RESOURCES.brick]: -1
            }
          }
        }
        else if (this.building == BUILDING.settlement) {
          return {
            [this.actionPlayer]: {
              [RESOURCES.wheat]: -1,
              [RESOURCES.sheep]: -1,
              [RESOURCES.brick]: -1,
              [RESOURCES.wood]: -1
            }
          }
        }
        else if (this.building == BUILDING.city) {
          return {
            [this.actionPlayer]: {
              [RESOURCES.wheat]: -2,
              [RESOURCES.ore]: -3
            }
          }
        }
      }
      else if (this.action == ACTIONS.receive) {
        return {
          [this.actionPlayer]: this.getResourceObject()
        }
      }
      else if (this.action == ACTIONS.steal) {
        return {
          [this.actionPlayer]: this.getResourceObject(),
          [this.targetPlayers[0]]: this.getResourceObject(true),
        }
      }
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
      "resigns"
    ]
    
    for (const filteredString of filteredStrings) {
      if (element.outerHTML.includes(filteredString)) {
        // if (debug) {
        //   console.log("Filtered element: ", element, "\nfor matching string: ", filteredString)
        // }
        return;
      }
    }
    
    let actionPlayer = "";
    let action = "";
    let targetPlayers = [];
    let resources = [];
    let building = "";
    
    for (const component of element.children) {
      // Player
      if (component.classList.contains("playerName")) {
        if (action == ACTIONS.steal) {
          targetPlayers.push(component.textContent)
        }
        else {
          actionPlayer = component.textContent;
        }
      }
      // Actions
      else if (component.textContent.includes("built")) {
        action = ACTIONS.build;
      }
      else if (component.textContent.includes("received")) {
        action = ACTIONS.receive;
      }
      else if (component.textContent.includes("stole")) {
        action = ACTIONS.steal;
      }
      // Buildings
      else if (component.outerHTML.includes("settlement")) {
        building = BUILDING.settlement;
      }
      else if (component.outerHTML.includes("road")) {
        building = BUILDING.road;
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
    }
    return new CatanEvent(
      action,
      actionPlayer,
      targetPlayers,
      resources,
      building
    )
  }
  window.createCatanEvent = createCatanEvent;
}

if (typeof addResourceDelta === 'undefined') {
  function addResourceDelta(resources, resourceDelta) {
    for (const [player, delta] of Object.entries(resourceDelta)) {
      if (!(player in resources)) {
        resources[player] = {
          brick: 0,
          wood: 0,
          ore: 0,
          sheep: 0,
          wheat: 0,
        }
      }
      for (const [resource, count] of Object.entries(delta)) {
        resources[player][resource] += count
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
      if (debug) {
        console.log(event)
        console.log(resourceDelta)
      }
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
    const orderedResources = ["wood", "brick", "sheep", "wheat", "ore"]
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
      console.log('No children found in score-panels');
      return;
    }  
    
    // Print out all children of the first child
    for (let i = 0; i < nestedDiv1.children.length; i++) {
      const nestedDiv2 = nestedDiv1.children[i].firstElementChild; // id = score-red
      if (!nestedDiv2) {
        console.log("No nested div2")
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
  console.log("parseTab function called");
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