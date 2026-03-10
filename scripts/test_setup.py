import spacy

print("spaCy works")

nlp = spacy.load("en_core_web_sm")
doc = nlp("Apple launches a new AI chip")

for ent in doc.ents:
    print(ent.text, ent.label_)