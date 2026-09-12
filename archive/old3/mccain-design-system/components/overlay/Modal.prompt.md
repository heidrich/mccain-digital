Großes Modal statt Unterseite: Backdrop Navy .55 + Blur, Fläche weiß 20 px, max 1180; erst landet die Fläche, dann Kopf → Aside → Bühne gestaffelt. Unter 960 px Bottom-Sheet mit Griff und klebendem Schließen-Button; Escape und Backdrop schließen.

```jsx
<Modal open={open} onClose={close} kicker="Leistung · KI-Tools" title="KI, die auf Ihren Daten läuft" lead="…" actions={<><Button chevron>Projekt anfragen</Button><Button variant="ghost">Die Seite fragen</Button></>} aside={<ul>…</ul>} stage={<div>…Mockup…</div>}>
  …Anwendungsfälle, Ablauf, FAQ…
</Modal>
```
