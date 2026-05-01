# Things need to know:
1. what are modern rpgs like: systems, stories, mechanics
2. try with AI chat apps / webs 

# Phase 0:
1. determine the background & world info
2. determine character background & info
3. github + push functionality

# Phase1:
1. **Completed** node server up & able to use AI api  
2. ability to switch between main & data AI
3. basic UI (main box + buttons + text input)
4. ai reply with json format -> let users make choices
5. variable & database

# Phase 2: 
1. combat UI and assets
2. Main menu + save/load
3. Character Select screen

# Phase 3:
1. data AI summarize chat history and update the chatHistory.txt ...
2. dynamic UI (damage, location, light level)
3. Advanced UI (proper CSS and professional look)
4. (optional) login/register system
5. (optional) dynamic music

main AI's response: main description + json format variable update + json format choices 

jfiohjfaihgarih <varUpdate> {json1} </varUpdate> <choices>{json2}</choices>

# ideas

## world-info  
    - characters
    - important events
    - quest info

## variables
    - mode (combat / noncombat) specific instructions for main ai
    - last prompt + last response
    - time + current location + equipments + player's status
    - player's relationships with every characters

## 2 AIs
main AI: acts as a game master and push the story forward
data AI: read through the last prompt and response from main AI and fill out the forms in the variables section

    - prompt editing from data AI which takes out the useful info for this single conversation and summarize them for the main AI
    - main description (main AI)
    - decision choices (main AI) limit 3
    - updated variables (data AI)

## Gameplay System Analysis
Combat System: The game uses a turn-based, top-down tactical combat system derived from D&D 5e.
Environmental Interaction: Players can utilize the environment to their advantage (e.g., throwing enemies, pushing them off cliffs), which is key to overcoming difficult fights.
Story & Choice: The narrative is characterized by significant branching, allowing for high player agency in how they tackle situations, from dialogue to combat.
Character Progression: The system allows for deep customization in class and character building, including managing "attrition rules".

## dice system: https://bg3.wiki/wiki/Dice_rolls