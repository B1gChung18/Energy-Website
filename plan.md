Plan

I want you to create a website for a project I am working on, the project is a tool to help calculate and compare the energy output of a single family home. The project is in german but I will be talking to you in english, please do the same, just make the information on the website in german.
 
The user experience on the website should be simple and intuitive, however it should also provide an opportunity for more in depth information if prompted. The primary function should remain the calculation and comparison of energy output.
 
As a user you should be able to select different options for differing variables, selecting what fits your circumstance. The following prompt is just for the initial draft so these are the things I would like:
1.        Very simple design, just Energy Calculation as the heading and primarily white with red accents throughout the experience. No need for fancy animations, graphics or the like it just need to work for now.
2.        There should be five different questions each with several different options as answers, multiple choice style. They should be the following (feel free to shorten and paraphrase but keep the core question):
è Q: How many residents do you have in your home
Answer Posibilities: 1 , 2 , 4
è Q: How many stories does your home have
Answer Posibilities: 1 , 2 , 3
è Q: Do you have an electric vehicle
Answer Posibilities: Yes , No
è Q: Do you have electricity storage
Answer Posibilities: Yes , No
è Q: How often do you use climate control
Answer Posibilities: Often, Sometimes, Never
                  Assign each answer a value and then give them an estimate of their electricity usage( please provide a table with the metrics for the answers). The comparison feature should be left out for now.
This current version of the website should serve as a draft and proof of concept for future expansion, so no need to make things to complicated. Please just follow the instructions as stated and make necessary adjustments, which you judge necessary.


Prompt 2:
Great first draft, here are some changes I would like you to make. There are three stages to the changes I would like you to make:
1.	First of all instead of making up the information, I would like you to use the information provided in the following link: https://www.epexspot.com/en/market-results. Please provide your calculations for the answers in a collapsable tab titled “Energy Calculations” at the bottom of the page. This page should provide the question for the rest of the answers you give and provide some explanation.
2.	I would like the questions not to be individual slides but more of a scroll down menu. Each question under another, reference the documents beginning in “Screenshot” found in the Energy Asset folder. Another thing, please use the Layout Image I will upload to base the new design on for the question portion. Keep the answer section the same that was real good.
2.2 The Graph described in the Layout image should just show the energy output in comparison to the average in Germany.


Prompt 3

I have an existing React energy calculator website (running on Vite at localhost:5173) that helps estimate electricity consumption for single-family homes. The central research question of the project is:

"Abschätzung von Kosteinsparpotenzialien bei der Nutzung eines dynamischen Stromtarifs in Einfamilienhäusern"
(Estimating cost-saving potential when using a dynamic electricity tariff in single-family homes)

I need you to rework two specific parts of the UI to orient them around this central question. Do NOT change the questions or the existing calculation logic. Only change the graph/comparison panel and the results overview section.

---

CHANGE 1 — THE GRAPH (currently shows: user kWh vs German average kWh)

Replace this with a bar or grouped bar chart that shows:
- "Festtarif" (fixed tariff) estimated annual cost in € — use 0.32 €/kWh × calculated kWh
- "Dynamischer Tarif" (dynamic tariff) estimated annual cost in € — use 0.22 €/kWh × calculated kWh as a placeholder (lower bound estimate)
- Highlight the gap between the two as "Einsparpotenzial" (savings potential) in €

Add a small label beneath the chart:
"* Dynamischer Tarif basiert auf EPEX SPOT Durchschnittswerten. Individuelle Einsparungen können variieren."

Keep the existing white/red color scheme. Use red for Festtarif bar, a lighter red or grey for dynamic tariff bar, and a green or accent color to highlight the savings gap.

---

CHANGE 2 — THE RESULTS OVERVIEW (currently shows: kWh/year, monthly cost, yearly cost, wholesale value)

Restructure this to answer the central question. Show the following:

1. Jahresverbrauch: X kWh (keep as-is)
2. Kosten (Festtarif): ca. X € / Jahr
3. Kosten (Dynamischer Tarif)*: ca. X € / Jahr  
4. Einsparpotenzial: ca. X € / Jahr  ← highlight this prominently in red or green
5. A small note: "* Basierend auf Platzhalterwerten. Wird mit echten EPEX SPOT Daten aktualisiert."

Remove the "Großhandelswert" line for now and replace it with the savings potential line.

---

DESIGN NOTES:
- Keep everything in German
- Keep the existing white background with red accents design
- The savings potential figure should be the most visually prominent output — it directly answers the research question
- Mark all dynamic tariff values clearly as placeholder/estimates so it is academically honest
- The structure should be easy to update later when real EPEX SPOT data and a more refined dynamic tariff model becomes available

Do not touch the question components, routing, or base calculation formula.


Prompt 4
We are going to slowly start adding values, data and formulas into the questionaire. The first thing we need to calculate is the fixed price tariff (Jahreskosten). To do this we need two things:
1. Add an additional question reading, "Was war ihr Jahresverbauch letztes Jahr?" To answer for the question the user should be able to type it in themselves (the unit of that answer has to be kWh/Jahr) 
2. The formula for calculating the "Jahreskosten" is as follows:
	Grundpreis: 122,96 EUR/Jahr
	Jahresverbrauch: individuell
	Arbeitspreis: 0,3751 EUR/kwH
	Jahreskosten = Grundpreis + (Jahresverbrauch * Arbeitspreiss
   Importantly, please add the calculation you do to the Energiebrechnungen tab.

   
Antwort DS   
Antwort wenn dynamischer Strompreis empfohlen wird:

Wir empfehlen Ihnen den dynamischer Stromtarif.

Bei einem dynamischen Vertrag erfolgt die Strombelieferung durch einen Energielieferanten, wobei sich der Arbeitspreis pro kWh an dem Börsenpreis orientiert und sich damit mehrmals täglich ändern kann.

Für eine optimale Nutzung empfehlen wir Ihnen sich ein intelligentes Messsystem anzulegen und dies mit ihren Geräten zu koppeln. Dadurch wird versichert, dass der Strom dann genutzt wird, wenn der Börsenstrompreis niedrig liegt.


Prompt 5

Hi for this step I would to change the question being asked, first up remove all existing questions on the website except number 6 "Was war Ihr Jahresverbrauch letzes Jahr".
Following this remove all the related numbers from the "Metriktabelle" and "Energieberechnungen", remember to keep everything related to question six in there.

Second step: Implement the following questions, special answers for each question will be in brackets under them.

- Wie häufig benutzen sie Heizungsanlage
(3 answers to chose: Immer, manchmal, nie)
- beheizte Wohnfläche
(open answer, measured in square meters)
- Hausbaujahr
(open answer)
- Wie viele Personen Leben im Haushalt
(open answer)
- Wie viele Personen sind von ca. 8-16Uhr zuhause
(open answer)
- Wie viele Personen sind von ca. 16-24Uhr zuhause
(open answer)
- Wie viele Stunden wird geheizt
(open answer, measured in h)
- Haben sie ein PV Anlage
(yes no answer, if yes ask the following three question with arrows infront)
-> Wie groß ist sie? (Fläche in quadratmeter)
-> Was ist deren Ausrichtung? 
-> Was ist deren Winkel (in Grad angegeben)
- Haben sie ein Speicher bspw. E-Auto
(yes no answer, if yes ask following question marked with arrow infront)
-> Wie groß ist der ihr Speicher
(open answer field, measured in kWh)
- Wie viele Stockwerke?
(open answer)
- Welches Heizungssystem benutzen sie
(answer options: Wärmepumpe, Gasheizung, Fönheizung, Fernwärme)
- Wie groß ist der allgemeine Stromverbrauch
(open answer, in kWh)

For the question I just gave you I don't need you to calculater anything form them, attach any metrics of formulas, those will come later. Keep the one I specified earlier I would also like you to give me a options button in the top right corner, to disable and enable if question are counted in the final count. 

Prompt 6
I want to expand on the question related to solar panels?
1. For the subquestions for "Haben sie eine PV-Anlage" specifically these:
-> Ausrichtung - 0* gleich Süden (Schritten von 0* bis 180*)
-> Neigungswinkel (0* bis 90* Grad)
The way to answer has to be a slider with increments of 10

2. I will attach an excel document with all pertinent formulas and values pertaining to the questions. I would like you to include these in the calculations for the end value and please include your calculations and values from the document in the "Energieberechnungen  tab.
3. Please just improve the overall grammar of the questions, make em correct


Prompt 7
Alright i got a list of simple changes I would like you to do in the website:
1. Please delete the first question "Wie häufig nutzen sie ihre Heizungsanlage"
2. Add the question "Haben sie eine E-Auto" (answer is a yes,no)
3. After removing question 1, please move question 12 "Wie hoch ist ihr allgemeiner Stromverbrauch" to the position of the first question. (answer options: open answer unit kWh and an option for unknown "unbekannt")
	If they answer unknown add the following pop up question: "Was war Ihr Stomverbrauch im letzten Jahr" 
	format the nature of the pop up the same as in question question 8 "Haben sie eine PV Anlage"
4. Please also change the Energiebrechnungen tab to show the active calculations, so the formulas with the numbers inputed are shown. Just for better clarity and so we can double check everything much easier.

Prompt 8
The following document contains information pertaining to formulas and values that need to be implemented into the website. Please implement the formulas and values (from segments 1-4) in relation to their respective questions, and then give me an overview of what you assigned where and how everything works. Please also add all the formulas and such to the "Energieberechnung" tab and have it show the numbers inputted by the user, so we can easily verify. It's fine if some question are still missing formulas or values, don't make anything up just do the ones that are there. 
Additionaly add a small but visible disclaimer at the bottom stating that all values are estimates and may not completely accurately represent reality. Thanks.

Prompt 9
More stuff to do:
1. Need a question changed for question 6 change it to "Haben sie ein Elektroauto"
	add the subquestions:
	 Haben sie eine Wallbox?
	 Dauer der Ladung?
	 Beginn der Ladezeit fürs Auto
	-> I'll send in an image of the formula in a moment wait until you get that
2. Remove question 9 
	The subquestion of Question 1 is the same as question 9 however only Question 9 affects the graph on the side.
3. Include a drop down menu for the module recommendation in the overview section
4. On occasion the site crashes when putting in the value for the size of the solar panel field. 
	On that note just make sure the site is not prone to crashes
5. Make a note to yourself somehow that last permanently that makes you correct the grammar in everything that you insert into the website
6. Make sure that the user can't enter answer that are physically impossible such as a negative use of energy. Don't restrict them any other way

