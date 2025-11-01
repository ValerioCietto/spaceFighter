(function(){
  // ---- Data ----
  const SPECIES = [
    {
      id: 'Humans',
      name: 'Human',
      img: 'assets/advanced-human.png',
      desc: `Humans are the long descendant of hominid monkeys from planet Terra, otherwise called Sol-3.
These biologic beings have DNA recombinated so much that it is way more adapted to space travel, with ability to switch off consciousness for seemingly lightning fast space travel, slowing time with andrenaline and need much less food and water to make maintaining costs negligible.
Human retain taste toward art, big space vessel and an inexhaustible curiosity for exploration.`,
      specialties: { Armor:2, Shields:4, Regen:1, Damage:4, Firerate:1, Tactics:3 }
    },
    {
      id: 'Jared',
      name: 'Jared',
      img: 'assets/advanced-jared.png',
      desc: `Jared evolved from a moon of their gas giant home world. More accustomed to the harshness of space, jared are obsessed with space from the beginning of their civilization.
They are wolf head mammals which make eggs and have a wolf pack society style.
Speed and reliability are the most prized values that reflects on their ships.`,
      specialties: { Armor:1, Shields:3, Regen:4, Damage:1, Firerate:4, Tactics:2 }
    },
    {
      id: 'Technicians',
      name: 'Technicians',
      img: 'assets/advanced-technician.png',
      desc: `Technicians are squid like creatures which either live in a protective suit that allows to walk on land or purely virtual entities with avatar robotic bodies. Virtual entities are the most courageous and pilot most of the fighter ships, organic ones are more cunning and prefer the thick shells of Capital, Dreadnoughts or cargo ships.
In Squid society, only the smartest idea is the one worth of fighting for and with this principle, the ships are designed.`,
      specialties: { Armor:4, Shields:1, Regen:2, Damage:3, Firerate:2, Tactics:4 }
    }
  ];

  // ---- Helpers ----
  function el(tag, cls, text){
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function renderBar(val /*0-4*/){
    const bar = el('div','bar');
    const fill = el('div','fill');
    const pct = Math.max(0, Math.min(4, val)) / 4 * 100;
    fill.style.width = pct+'%';
    bar.appendChild(fill);
    return bar;
  }

  function renderCard(sp){
    const card = el('article','card');

    // media
    const media = el('div','media');
    const img = new Image();
    img.alt = sp.name;
    img.src = sp.img;
    media.appendChild(img);

    // body
    const body = el('div','body');
    const h2 = el('h2',null, sp.name);
    const p = el('p',null, sp.desc);
    body.append(h2,p);

    // specialties
    const specs = el('div','specs');
    const labels = ['Armor','Shields','Regen','Damage','Firerate','Tactics'];
    labels.forEach(lb=>{
      const row = el('div','spec-row');
      row.append(el('div','label',lb), renderBar(sp.specialties[lb]||0));
      specs.appendChild(row);
    });
    body.appendChild(specs);

    // actions
    const actions = el('div','actions');
    const choose = el('button','btn primary full','Choose '+sp.name);
    choose.addEventListener('click', ()=> chooseSpecies(sp));
    actions.appendChild(choose);

    card.append(media, body, actions);
    return card;
  }

  function chooseSpecies(sp){
    // Save selection to localStorage
    SFSave.set('profile.chosenSpecies', { id: sp.id, name: sp.name, ts: Date.now() });
    // Optional convenience: mark a "new game" seed
    const initial = {
      species: sp.id,
      fame: { military:0, industrial:0, trader:0, merc:0 },
      reputation: {},
      createdAt: Date.now()
    };
    SFSave.set('player', initial);
    // Navigate
    const q = new URLSearchParams({ new: '1', species: sp.id });
    window.location.href = 'game.html?' + q.toString();
  }

  // random selection
  function randomPick(){
    const i = Math.floor(Math.random() * SPECIES.length);
    chooseSpecies(SPECIES[i]);
  }

  // ---- Mount ----
  const main = document.querySelector('main.grid');
  SPECIES.forEach(sp => main.appendChild(renderCard(sp)));

  // Keyboard shortcuts: 1/2/3 choose, R random
  window.addEventListener('keydown', (e)=>{
    if (e.code === 'Digit1') chooseSpecies(SPECIES[0]);
    if (e.code === 'Digit2') chooseSpecies(SPECIES[1]);
    if (e.code === 'Digit3') chooseSpecies(SPECIES[2]);
    if (e.code === 'KeyR') randomPick();
  });

  // Skip/Random button
  document.getElementById('btnSkip').addEventListener('click', randomPick);
})();
