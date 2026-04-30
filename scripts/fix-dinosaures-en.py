"""
fix-dinosaures-en.py
Déduplique dinosaures/en, génère des questions manquantes pour atteindre 600.
Les questions EN suivent l'angle "français langue étrangère via les dinosaures".
Usage : python3 scripts/fix-dinosaures-en.py
"""

import json
import copy
from collections import Counter

SRC = "src/data/questions/en/dinosaures.json"
TARGET_TOTAL = 600
TARGET_PER_DIFF = 200  # 200 easy + 200 medium + 200 hard

# ---------------------------------------------------------------------------
# Nouvelles questions — chaque entrée : (question, correct, [distractors x3])
# L'answer letter est assignée automatiquement selon le quota cible.
# ---------------------------------------------------------------------------

NEW_EASY = [
    # Body parts
    ("The French word 'ventre' refers to which part of a dinosaur's body?", "Belly or stomach", ["Back", "Tail", "Neck"]),
    ("A dinosaur's 'bras' are its ___.", "Arms", ["Legs", "Claws", "Wings"]),
    ("What does 'œil' mean when describing a dinosaur's features?", "Eye", ["Ear", "Nose", "Mouth"]),
    ("The T-Rex had tiny 'bras'. What body part is 'bras'?", "Arms", ["Legs", "Claws", "Teeth"]),
    ("A dinosaur's 'museau' is its ___.", "Snout", ["Tail", "Claw", "Eye"]),
    ("The French word 'langue' refers to a dinosaur's ___.", "Tongue", ["Teeth", "Claw", "Horn"]),
    ("What is a dinosaur's 'pied' in English?", "Foot", ["Hand", "Tail", "Head"]),
    ("A 'gorge' is the throat of a dinosaur. What does 'gorge' mean?", "Throat", ["Stomach", "Back", "Chest"]),
    ("The French word 'épaule' refers to which body part?", "Shoulder", ["Knee", "Elbow", "Hip"]),
    ("Dinosaur 'doigts' are its fingers or toes. What is 'doigt'?", "Finger or toe", ["Claw", "Scale", "Feather"]),
    ("A dinosaur's 'cuisse' is its ___.", "Thigh", ["Arm", "Neck", "Back"]),
    ("The 'nuque' of a dinosaur is the back of its ___.", "Neck", ["Head", "Tail", "Foot"]),
    ("What does 'flanc' mean when describing a dinosaur's side?", "Flank or side", ["Back", "Belly", "Head"]),
    ("A dinosaur's 'poitrine' is its ___.", "Chest", ["Tail", "Neck", "Foot"]),
    ("The French word 'cerveau' refers to a dinosaur's ___.", "Brain", ["Heart", "Stomach", "Lung"]),
    # Adjectives
    ("If a dinosaur is 'féroce', it is very ___.", "Fierce", ["Gentle", "Slow", "Small"]),
    ("A dinosaur described as 'doux' is ___.", "Gentle", ["Fierce", "Fast", "Huge"]),
    ("The French word 'vieux' means that a dinosaur species was very ___.", "Old", ["New", "Small", "Fast"]),
    ("If a dinosaur is 'jeune', it is ___.", "Young", ["Old", "Big", "Strong"]),
    ("A dinosaur described as 'dangereux' is very ___.", "Dangerous", ["Safe", "Gentle", "Slow"]),
    ("The word 'énorme' describes a dinosaur that is ___.", "Enormous", ["Tiny", "Fast", "Quiet"]),
    ("If a dinosaur species is 'sauvage', it is ___.", "Wild", ["Tame", "Old", "Small"]),
    ("A dinosaur described as 'agile' can move very ___.", "Nimbly or quickly", ["Slowly", "Heavily", "Quietly"]),
    ("The French word 'minuscule' describes a dinosaur that is very ___.", "Tiny", ["Large", "Fast", "Old"]),
    ("A dinosaur that is 'fort' is very ___.", "Strong", ["Weak", "Slow", "Small"]),
    ("If a dinosaur is 'calme', it is ___.", "Calm", ["Aggressive", "Loud", "Fast"]),
    ("The French word 'fragile' describes something easily ___.", "Broken", ["Lost", "Found", "Hidden"]),
    ("A dinosaur's 'solide' bones are very ___.", "Solid or strong", ["Fragile", "Light", "Hollow"]),
    ("The word 'intelligent' in French describes a smart dinosaur. Is it the same in English?", "Yes, intelligent", ["No, clever", "No, smart only", "No, wise"]),
    ("A dinosaur that is 'lent' moves very ___.", "Slowly", ["Quickly", "Loudly", "Quietly"]),
    # Verbs
    ("The French verb 'chasser' describes what a T-Rex did. What did it do?", "Hunt", ["Sleep", "Swim", "Fly"]),
    ("Scientists 'creuser' the ground to find fossils. What do they do?", "Dig", ["Wash", "Paint", "Measure"]),
    ("Female dinosaurs 'pondre' eggs. What does 'pondre' mean?", "To lay eggs", ["To eat", "To run", "To fight"]),
    ("A T-Rex could 'rugir' very loudly. What did it do?", "Roar", ["Whisper", "Sing", "Hiss"]),
    ("Some dinosaurs could 'grimper' trees. What could they do?", "Climb", ["Fly", "Swim", "Run"]),
    ("Many dinosaurs could 'sauter' far. What could they do?", "Jump", ["Dig", "Swim", "Fly"]),
    ("Some dinosaurs used to 'se cacher' from predators. What did they do?", "Hide", ["Fight", "Eat", "Sleep"]),
    ("Herds of dinosaurs would 'migrer' each season. What did they do?", "Migrate", ["Fight", "Hibernate", "Swim"]),
    ("Two dinosaurs could 'se battre' for food. What did they do?", "Fight", ["Sleep", "Run", "Eat"]),
    ("A mother dinosaur would 'protéger' her eggs. What would she do?", "Protect", ["Eat", "Hide", "Lose"]),
    # Environment
    ("Many plant-eating dinosaurs lived on the 'plaine'. What is a 'plaine'?", "Plain or flatland", ["Mountain", "Ocean", "Desert"]),
    ("Some dinosaurs lived near a 'falaise'. What is a 'falaise'?", "Cliff", ["River", "Forest", "Plain"]),
    ("Dinosaurs drank from 'rivières'. What is a 'rivière'?", "River", ["Lake", "Sea", "Pond"]),
    ("Some small dinosaurs hid in 'grottes'. What is a 'grotte'?", "Cave", ["Tree", "Bush", "Rock"]),
    ("Dinosaurs roamed the 'prairie'. What is a 'prairie'?", "Meadow or grassland", ["Mountain", "Ocean", "Desert"]),
    ("A 'volcan' could destroy a dinosaur's habitat. What is a 'volcan'?", "Volcano", ["River", "Mountain", "Forest"]),
    ("Dinosaurs left footprints in the 'boue'. What is 'boue'?", "Mud", ["Sand", "Rock", "Ice"]),
    ("Some fossils are found under 'sable'. What is 'sable'?", "Sand", ["Rock", "Mud", "Clay"]),
    ("Dinosaurs sometimes drank from a 'lac'. What is a 'lac'?", "Lake", ["River", "Sea", "Swamp"]),
    ("A 'jungle' was home to many dinosaurs. Is 'jungle' the same in English?", "Yes, jungle", ["No, forest", "No, rainforest only", "No, woods"]),
    ("Dinosaur fossils are found in 'roches'. What is a 'roche'?", "Rock", ["Sand", "Water", "Ice"]),
    ("Some dinosaurs lived on an 'île'. What is an 'île'?", "Island", ["Mountain", "Plain", "Desert"]),
    ("The 'côte' of a prehistoric sea was home to marine reptiles. What is 'côte'?", "Coast or shore", ["Mountain", "Forest", "Plain"]),
    ("Dinosaurs once roamed every 'continent'. Is this word the same in French and English?", "Yes, continent", ["No, continu", "No, land mass", "No, terre"]),
    ("The 'marais' was a wet environment some dinosaurs used. What is 'marais'?", "Marsh or bog", ["Desert", "Forest", "Mountain"]),
    # Time & numbers
    ("Dinosaurs lived 'il y a des millions d'années'. What does 'million' mean in English?", "Million", ["Thousand", "Billion", "Hundred"]),
    ("The word 'milliard' in French means one ___.", "Billion", ["Million", "Thousand", "Trillion"]),
    ("The French word 'siècle' means one ___.", "Century", ["Year", "Decade", "Millennium"]),
    ("If something happened 'autrefois', it happened ___.", "In the past", ["In the future", "Right now", "Yesterday"]),
    ("The French phrase 'il y a longtemps' means ___.", "Long ago", ["Right now", "Tomorrow", "Next year"]),
    ("The French word 'avenir' refers to the ___.", "Future", ["Past", "Present", "History"]),
    # Colors & appearance
    ("The French word 'vert' describes the color of many dinosaurs. What color is it?", "Green", ["Red", "Blue", "Yellow"]),
    ("Many dinosaurs had 'brun' skin. What color is 'brun'?", "Brown", ["Grey", "Green", "Black"]),
    ("A dinosaur with 'gris' scales was colored ___.", "Grey", ["Brown", "Green", "Blue"]),
    ("The French word 'tacheté' describes a dinosaur's skin. What does it mean?", "Spotted", ["Striped", "Plain", "Shiny"]),
    ("A 'rayé' dinosaur had a ___ pattern on its skin.", "Striped", ["Spotted", "Plain", "Scaly"]),
    ("A dinosaur with 'sombre' skin was ___.", "Dark-colored", ["Light-colored", "Spotted", "Striped"]),
    ("The word 'clair' describes something ___.", "Light or pale", ["Dark", "Spotted", "Striped"]),
    # Dinosaur basics
    ("The French phrase 'ère des dinosaures' refers to the ___ of dinosaurs.", "Age or era", ["End", "Birth", "Study"]),
    ("The T-Rex's 'rugissement' was very loud. What is a 'rugissement'?", "Roar", ["Whisper", "Hiss", "Song"]),
    ("In French, 'nid' means the place where dinosaurs laid eggs. What is it?", "Nest", ["Cave", "Tree", "Lake"]),
    ("Dinosaurs were called 'terribles lézards' by some. What does 'lézard' mean?", "Lizard", ["Dragon", "Monster", "Snake"]),
    ("The 'extinction' of dinosaurs happened long ago. Is this word the same in English?", "Yes, extinction", ["No, vanishing", "No, disappearance only", "No, death"]),
    ("What is the French word for a 'meteor' that hit the Earth?", "Météorite", ["Planète", "Étoile", "Comète"]),
    ("The French word 'ancêtre' means that birds are ___ of dinosaurs.", "Ancestors", ["Enemies", "Friends", "Copies"]),
    ("In French, 'paléontologue' is the scientist who studies dinosaurs. What is the English word?", "Paleontologist", ["Biologist", "Geologist", "Zoologist"]),
    ("The French word 'squelette' means the ___ of a dinosaur.", "Skeleton", ["Skin", "Fossil", "Print"]),
    ("A dinosaur's 'écailles' covered its skin. What are 'écailles'?", "Scales", ["Feathers", "Bones", "Claws"]),
    ("The French word 'plumes' describes feathers found on some dinosaurs. Is 'plume' similar in English?", "Yes, plume means feather", ["No, it means scale", "No, it means bone", "No, it means claw"]),
    ("In French, 'habitat' means where dinosaurs lived. Is it the same in English?", "Yes, habitat", ["No, home", "No, area only", "No, territory"]),
    ("The word 'espèce' in French refers to a dinosaur ___.", "Species", ["Bone", "Fossil", "Era"]),
    ("The French phrase 'régime alimentaire' describes a dinosaur's ___.", "Diet", ["Home", "Speed", "Size"]),
    ("What French word describes a group of the same dinosaurs travelling together?", "Troupeau (herd)", ["Famille", "Nid", "Territoire"]),
    ("The 'crâne' of a T-Rex was huge. What is a 'crâne'?", "Skull", ["Spine", "Jaw", "Rib"]),
    ("In French, 'patte' can mean leg or paw. A T-Rex had two large ___.", "Legs (pattes)", ["Wings", "Arms", "Tails"]),
    ("The French word 'vitesse' describes how fast a dinosaur ran. What is 'vitesse'?", "Speed", ["Height", "Weight", "Length"]),
    ("What does the French word 'taille' mean when describing a dinosaur?", "Size", ["Color", "Speed", "Diet"]),
    ("In French, 'prédateur' is an animal that hunts others. What is the English word?", "Predator", ["Prey", "Herbivore", "Scavenger"]),
    ("The French word 'proie' refers to what a predator ___.", "Catches or eats (prey)", ["Hunts with", "Runs from", "Builds"]),
    ("What does 'reptile' mean in French? Is it the same in English?", "Yes, reptile", ["No, lizard", "No, snake", "No, amphibian"]),
    ("A 'bipède' walks on ___ legs.", "Two", ["Four", "Six", "Eight"]),
    ("A 'quadrupède' walks on ___ legs.", "Four", ["Two", "Six", "Three"]),
    ("The French word 'coquille' refers to the hard shell of a dinosaur egg. What is 'coquille'?", "Shell", ["Yolk", "White", "Crack"]),
    ("What does the French word 'ponte' mean in the context of dinosaur reproduction?", "Egg-laying", ["Hatching", "Nesting", "Growing"]),
    ("In French, 'soins parentaux' describes the care parents gave to young dinosaurs. What is 'soins'?", "Care", ["Food", "Shelter", "Water"]),
    ("The French word 'rugosité' describes a rough texture on dinosaur skin. What does 'rugueux' mean?", "Rough", ["Smooth", "Soft", "Hard"]),
    ("A 'litige' in paleontology means two scientists ___.", "Disagree", ["Agree", "Meet", "Discover"]),
    ("The French word 'couleur' refers to what we can sometimes guess about dinosaurs from fossils. What is 'couleur'?", "Color", ["Size", "Weight", "Speed"]),
]

NEW_MEDIUM = [
    # French geological & classification terms
    ("The French word 'sédiment' describes where fossils form. What is 'sédiment'?", "Sediment", ["Magma", "Crystal", "Metal"]),
    ("In French, 'strate' refers to a layer of rock. What is the English word?", "Stratum or layer", ["Stone", "Sand", "Soil"]),
    ("The 'Mésozoïque' is the era when dinosaurs lived. What is the English name?", "Mesozoic", ["Paleozoic", "Cenozoic", "Neozoic"]),
    ("A 'empreinte' preserved in rock is a fossil ___ of a dinosaur.", "Print or impression", ["Bone", "Tooth", "Scale"]),
    ("The French word 'minéralisation' describes how bones become fossils. Is the English word similar?", "Yes, mineralization", ["No, petrification only", "No, calcification", "No, fossilization only"]),
    ("In French, 'couche géologique' describes a ___ of rock.", "Layer", ["Type", "Color", "Weight"]),
    ("The word 'vertébré' describes a dinosaur with a ___ .", "Backbone or spine", ["Tail", "Horn", "Shell"]),
    ("In French, 'bipédie' is the ability to walk on two feet. What is the English equivalent?", "Bipedalism", ["Quadrupedalism", "Flying", "Swimming"]),
    ("The French word 'prédation' describes the hunting ___ of carnivores.", "Behavior", ["Speed", "Size", "Sound"]),
    ("In French, 'thermorégulation' describes how dinosaurs managed body ___.", "Temperature", ["Weight", "Speed", "Color"]),
    ("The word 'adaptation' in French means a useful change in an organism. Is it the same in English?", "Yes, adaptation", ["No, evolution only", "No, mutation", "No, selection"]),
    ("In French, 'symbiose' describes two species helping each other. What is the English word?", "Symbiosis", ["Parasitism", "Predation", "Competition"]),
    ("The French term 'troupeau' describes many dinosaurs moving together. What is it?", "Herd", ["Pack", "Flock", "Colony"]),
    ("In French, 'nidification' is the building of a ___.", "Nest", ["Burrow", "Den", "Cave"]),
    ("The word 'camouflage' in French describes how some dinosaurs hid. Is it the same in English?", "Yes, camouflage", ["No, hiding", "No, disguise only", "No, coloring"]),
    ("The French term 'instinct' describes natural behavior. Is it the same in English?", "Yes, instinct", ["No, habit only", "No, learning", "No, reaction"]),
    ("In French, 'migration' refers to long-distance travel. Is it the same in English?", "Yes, migration", ["No, movement", "No, travel only", "No, journey"]),
    ("The French word 'territoire' describes the area a dinosaur defended. What is it in English?", "Territory", ["Region", "Home", "Plain"]),
    ("In French, 'hiérarchie' describes the social order in a dinosaur group. What is it?", "Hierarchy", ["Family", "Pack", "Group"]),
    ("The word 'ossification' in French describes how cartilage becomes bone. Is it similar in English?", "Yes, ossification", ["No, hardening only", "No, calcification", "No, solidification"]),
    # Periods and time
    ("The French term 'Trias' is the first period dinosaurs appeared. What is the English name?", "Triassic", ["Jurassic", "Cretaceous", "Permian"]),
    ("In French, 'Crétacé' is the last period dinosaurs lived in. What is it in English?", "Cretaceous", ["Jurassic", "Triassic", "Permian"]),
    ("The 'frontière K-Pg' marks the ___ of the dinosaurs.", "End or extinction", ["Beginning", "Migration", "Evolution"]),
    ("In French, 'extinction de masse' means a ___ extinction event.", "Mass", ["Single", "Slow", "Small"]),
    ("The French word 'géologique' refers to things related to ___.", "Geology or rocks", ["Biology", "History", "Chemistry"]),
    # Classification
    ("In French, 'Saurischiens' are dinosaurs with ___ hips (like lizards).", "Lizard-like", ["Bird-like", "Fish-like", "Crocodile-like"]),
    ("The French 'Ornithischiens' had ___ hips (like birds).", "Bird-like", ["Lizard-like", "Crocodile-like", "Snake-like"]),
    ("The French term 'théropode' describes a dinosaur that walked on ___ legs.", "Two (bipedal)", ["Four", "Six", "Eight"]),
    ("In French, 'sauropode' describes a dinosaur with a very long ___.", "Neck", ["Tail", "Horn", "Claw"]),
    ("The French word 'cératopsien' describes dinosaurs with horns and a ___.", "Frill or crest", ["Long neck", "Armored back", "Spiked tail"]),
    # Scientific vocabulary
    ("The French term 'paléoenvironnement' means the study of ancient ___.", "Environments", ["Bones", "Fossils", "Species"]),
    ("In French, 'datation' is the process of finding the ___ of a fossil.", "Age", ["Size", "Color", "Weight"]),
    ("The French word 'analyse' is used when scientists study samples. Is it similar in English?", "Yes, analysis", ["No, study only", "No, test", "No, research"]),
    ("In French, 'reconstruction' means rebuilding a dinosaur's appearance from ___.", "Fossils", ["Stories", "Paintings", "Guesses"]),
    ("The French word 'hypothèse' is what scientists make before testing. What is it in English?", "Hypothesis", ["Theory", "Law", "Fact"]),
    ("The French word 'comparaison' is used to identify dinosaurs. What is it?", "Comparison", ["Collection", "Calculation", "Classification"]),
    ("In French, 'collection' refers to gathered fossils in a museum. Is it the same in English?", "Yes, collection", ["No, display", "No, exhibit", "No, archive"]),
]

NEW_HARD = [
    # Technical paleontology
    ("The French term 'taphonomie' studies how organisms become fossils. What is it in English?", "Taphonomy", ["Taxonomy", "Toponymy", "Tachygraphy"]),
    ("In French, 'phylogénèse' describes the evolutionary history of a species. What is it in English?", "Phylogenesis or phylogeny", ["Phylosophy", "Physiology", "Phytology"]),
    ("The French word 'paléobiogéographie' studies the distribution of ancient life. What is the English term?", "Paleobiogeography", ["Paleontology", "Paleoecology", "Paleoclimatology"]),
    ("In French, 'ostéologie' is the study of ___.", "Bones", ["Fossils", "Scales", "Teeth"]),
    ("The French term 'ichnologie' studies fossil ___ of dinosaurs.", "Tracks and traces", ["Bones", "Teeth", "Eggs"]),
    ("The French word 'diagenèse' refers to chemical changes in rock over ___.", "Time", ["Space", "Water", "Heat"]),
    ("In French, 'paléoclimatologie' studies ancient ___.", "Climates", ["Bones", "Species", "Rocks"]),
    ("The French term 'biostratigraphie' uses ___ to date rock layers.", "Fossils", ["Minerals", "Water", "Metals"]),
    ("In French, 'paléoécologie' studies how ancient organisms ___ with their environment.", "Interacted", ["Evolved", "Moved", "Died"]),
    ("The word 'morphologie' in French refers to the ___ of a dinosaur.", "Shape or form", ["Color", "Diet", "Speed"]),
    # Latin/Greek roots
    ("The Latin root 'rex' in 'Tyrannosaurus Rex' means ___.", "King", ["Giant", "Terror", "Hunter"]),
    ("The Greek root 'sauro' in dinosaur names means ___.", "Lizard", ["Hunter", "Giant", "Bone"]),
    ("The Greek root 'raptor' in 'Velociraptor' means ___.", "Thief or seizer", ["Runner", "Hunter", "Killer"]),
    ("The Greek root 'brachio' in 'Brachiosaurus' means ___.", "Arm", ["Neck", "Leg", "Foot"]),
    ("The Latin root 'tri' in 'Triceratops' means ___.", "Three", ["Large", "Horn", "Head"]),
    ("The Greek prefix 'paleo' in 'paleontology' means ___.", "Ancient or old", ["New", "Stone", "Life"]),
    ("The Greek word 'logos' at the end of 'paleontology' means ___.", "Study or science", ["Bone", "Life", "Ancient"]),
    ("The Greek root 'ornitho' in 'ornithischian' means ___.", "Bird", ["Lizard", "Reptile", "Fish"]),
    ("The Greek root 'stego' in 'Stegosaurus' means ___.", "Roof or plate", ["Spike", "Scale", "Crest"]),
    ("The Greek root 'ankylo' in 'Ankylosaurus' means ___.", "Fused or stiff", ["Armored", "Spiked", "Heavy"]),
    # Advanced cognates
    ("The French word 'endémique' describes a species found only in one region. What is it in English?", "Endemic", ["Epidemic", "Systemic", "Academic"]),
    ("In French, 'paléontologie' has changed since dinosaur DNA was studied. Is DNA the same in English?", "Yes, DNA", ["No, ADN", "No, genetic code", "No, gene"]),
    ("The French word 'coprolite' describes fossilized dinosaur dung. Is it similar in English?", "Yes, coprolite", ["No, dung stone", "No, fecal fossil", "No, waste rock"]),
    ("In French, 'cladistique' classifies organisms by shared features. What is it in English?", "Cladistics", ["Claddism", "Classicism", "Cladology"]),
    ("The French term 'convergence évolutive' means two species developed similar features ___.", "Independently", ["Together", "From the same ancestor", "By chance"]),
    # Scientific methods
    ("In French, 'datation radiométrique' uses radioactive decay to find the ___ of rocks.", "Age", ["Color", "Weight", "Composition"]),
    ("The French word 'spécimen' refers to a single example fossil. Is it similar in English?", "Yes, specimen", ["No, sample only", "No, example", "No, fossil"]),
    ("In French, 'reconstruction musculaire' uses fossil attachment points to understand ___.", "Muscles", ["Speed", "Diet", "Intelligence"]),
    ("The term 'biomécanique' in French studies how dinosaurs ___.", "Moved physically", ["Ate", "Reproduced", "Communicated"]),
    ("In French, 'paléohistologie' studies microscopic ___ of fossil bones.", "Tissue structure", ["Color patterns", "Growth rings", "Mineral content"]),
    ("The French term 'analyse isotopique' uses chemical ___ to study dinosaur diet.", "Isotopes", ["Colors", "Shapes", "Weights"]),
    # Advanced classification
    ("In French, 'archosaure' is the group containing both dinosaurs and ___.", "Crocodilians and birds", ["Snakes and lizards", "Fish and amphibians", "Mammals and reptiles"]),
    ("The French term 'endothermie' describes a dinosaur that generated its own ___.", "Body heat", ["Food", "Sound", "Light"]),
    ("In French, 'grégaire' describes a dinosaur that lived in ___.", "Groups or herds", ["Solitude", "Water", "Caves"]),
    ("The French term 'dimorphisme sexuel' means males and females of a species looked ___.", "Different", ["The same", "Bigger", "Smaller"]),
    ("In French, 'coévolution' means two species evolved ___ each other.", "Alongside or because of", ["Against", "Before", "After"]),
    ("The French word 'fossilisation' has several stages. The first is ___.", "Death of the organism", ["Discovery", "Excavation", "Preparation"]),
    ("In French, 'paléopathologie' studies diseases and injuries in ___ organisms.", "Ancient fossil", ["Living", "Modern", "Marine"]),
    ("The French term 'allométrie' studies how body parts ___ as an animal grows.", "Change in proportion", ["Change in color", "Change in texture", "Change in weight"]),
    ("In French, 'dérive des continents' explains why dinosaur fossils are found on ___ continents.", "All", ["One", "Two", "Three"]),
    ("The French word 'paléoart' refers to artistic ___ of prehistoric life.", "Reconstruction or illustration", ["Fossil", "Excavation", "Classification"]),
    ("In French, 'exaptation' describes a feature that was originally used for one purpose but later ___.", "Used for another purpose", ["Disappeared", "Grew larger", "Changed color"]),
    ("The French term 'hétérochronie' describes changes in the ___ of development.", "Timing or rate", ["Color", "Size", "Speed"]),
    ("The French word 'allèle' in genetics refers to a version of a ___.", "Gene", ["Bone", "Fossil", "Cell"]),
]

# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------

def load_json(path):
    with open(path) as f:
        return json.load(f)

def deduplicate(questions):
    seen = set()
    unique = []
    for q in questions:
        if q['question'] not in seen:
            seen.add(q['question'])
            unique.append(q)
    return unique

def make_question(idx, difficulty, text, correct, distractors, target_answer):
    """Build a question dict with the correct answer in the target_answer position."""
    letters = ['A', 'B', 'C', 'D']
    options_list = distractors[:]
    # Insert correct answer at target_answer position
    pos = letters.index(target_answer)
    options_list.insert(pos, correct)
    # Trim to 4 options (in case)
    options_list = options_list[:4]
    return {
        "id": f"dino-en-{idx:04d}",
        "category": "dinosaures",
        "subcategory": None,
        "locale": "en",
        "difficulty": difficulty,
        "question": text,
        "options": {l: options_list[i] for i, l in enumerate(letters)},
        "answer": target_answer,
    }

def assign_answers(questions_raw, difficulty, start_id, answer_quota):
    """
    Assign answer letters to questions to meet quota.
    answer_quota: dict {letter: count_needed}
    """
    # Build a rotation list of letters from quota
    rotation = []
    for letter in ['A', 'B', 'C', 'D']:
        rotation.extend([letter] * answer_quota.get(letter, 0))
    # Fill remainder if quota doesn't match question count
    while len(rotation) < len(questions_raw):
        rotation.append('B')

    result = []
    for i, (text, correct, distractors) in enumerate(questions_raw):
        target = rotation[i % len(rotation)]
        q = make_question(start_id + i, difficulty, text, correct, distractors, target)
        result.append(q)
    return result

def main():
    data = load_json(SRC)
    original = data['questions']
    print(f"Questions originales : {len(original)}")

    # Step 1 — deduplicate
    unique = deduplicate(original)
    print(f"Après déduplication : {len(unique)}")

    by_diff = {}
    for d in ['easy', 'medium', 'hard']:
        by_diff[d] = [q for q in unique if q['difficulty'] == d]
        print(f"  {d}: {len(by_diff[d])}")

    # Step 2 — renumber IDs sequentially
    for i, q in enumerate(unique):
        q['id'] = f"dino-en-{i+1:04d}"

    # Step 3 — count current answer distribution
    current_answers = Counter(q['answer'] for q in unique)
    total_target = TARGET_TOTAL
    target_per_letter = total_target // 4  # 150
    print(f"\nDistribution actuelle (unique) :")
    for l in 'ABCD':
        print(f"  {l}: {current_answers[l]} (besoin: {target_per_letter - current_answers[l]} de plus)")

    needed = {l: max(0, target_per_letter - current_answers[l]) for l in 'ABCD'}
    total_needed = sum(needed.values())
    need_easy = TARGET_PER_DIFF - len(by_diff['easy'])
    need_medium = TARGET_PER_DIFF - len(by_diff['medium'])
    need_hard = TARGET_PER_DIFF - len(by_diff['hard'])
    print(f"\nQuestions à générer : easy={need_easy}, medium={need_medium}, hard={need_hard}, total={need_easy+need_medium+need_hard}")
    print(f"Lettres à équilibrer : {dict(needed)} (total={total_needed})")

    # Step 4 — assign answer quotas per difficulty (proportionally)
    total_new = need_easy + need_medium + need_hard

    def split_quota(quota_dict, counts):
        """Split letter quotas across difficulties proportionally."""
        quotas = {d: {} for d in counts}
        for letter, total_q in quota_dict.items():
            if total_new == 0:
                break
            rem = total_q
            diffs = list(counts.keys())
            for i, d in enumerate(diffs):
                if i == len(diffs) - 1:
                    quotas[d][letter] = rem
                else:
                    share = round(total_q * counts[d] / total_new)
                    quotas[d][letter] = share
                    rem -= share
        return quotas

    diff_counts = {'easy': need_easy, 'medium': need_medium, 'hard': need_hard}
    quotas = split_quota(needed, diff_counts)

    # Step 5 — pick question lists
    new_easy_raw = NEW_EASY[:need_easy]
    new_medium_raw = NEW_MEDIUM[:need_medium]
    new_hard_raw = NEW_HARD[:need_hard]

    if len(new_easy_raw) < need_easy:
        print(f"⚠️  Pas assez de questions easy définies ({len(new_easy_raw)}/{need_easy})")
    if len(new_medium_raw) < need_medium:
        print(f"⚠️  Pas assez de questions medium définies ({len(new_medium_raw)}/{need_medium})")
    if len(new_hard_raw) < need_hard:
        print(f"⚠️  Pas assez de questions hard définies ({len(new_hard_raw)}/{need_hard})")

    base_id = len(unique) + 1
    new_easy_qs = assign_answers(new_easy_raw, 'easy', base_id, quotas['easy'])
    base_id += len(new_easy_qs)
    new_medium_qs = assign_answers(new_medium_raw, 'medium', base_id, quotas['medium'])
    base_id += len(new_medium_qs)
    new_hard_qs = assign_answers(new_hard_raw, 'hard', base_id, quotas['hard'])

    # Step 6 — merge and renumber
    all_questions = unique + new_easy_qs + new_medium_qs + new_hard_qs
    for i, q in enumerate(all_questions):
        q['id'] = f"dino-en-{i+1:04d}"

    # Step 7 — final stats
    final_total = len(all_questions)
    final_diff = Counter(q['difficulty'] for q in all_questions)
    final_ans = Counter(q['answer'] for q in all_questions)
    print(f"\n=== RÉSULTAT FINAL ===")
    print(f"Total : {final_total}")
    for d in ['easy', 'medium', 'hard']:
        print(f"  {d}: {final_diff[d]}")
    print(f"\nDistribution des réponses :")
    for l in 'ABCD':
        pct = final_ans[l] / final_total * 100
        print(f"  {l}: {final_ans[l]} ({pct:.1f}%)")

    # Step 8 — write file
    data['questions'] = all_questions
    with open(SRC, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n✅  Fichier sauvegardé : {SRC}")

if __name__ == '__main__':
    main()
