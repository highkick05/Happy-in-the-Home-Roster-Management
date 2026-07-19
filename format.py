with open("src/components/VehiclesView.tsx", "r") as f:
    text = f.read()

text = text.replace(";", ";\n")

with open("src/components/VehiclesView.tsx", "w") as f:
    f.write(text)
