# Every deliberate change this site makes to the Claude Design export, in one
# re-runnable place.
#
#     python tools/patch_export.py
#
# WHY ONE FILE
# The export in mccain-design-system/reference/ is the build's source, and a
# fresh export from Claude Design overwrites it. Scattering the edits across
# several one-shot scripts means the next export silently loses whichever ones
# nobody remembered. This applies all of them, is safe to run twice, and REFUSES
# to guess: if the ground it expects has moved, it stops and says which patch
# and which file, rather than half-patching a contact form.
#
# Run it after any fresh export, then `node tools/prerender.mjs`.
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
REF = os.path.join(SITE, "mccain-design-system", "reference")

TARGETS = [
    os.path.join(REF, "index.html"),
    os.path.join(REF, "McCain Digital v2.dc.html"),
]

WEB3FORMS_KEY = "d3e1fa0a-cbe1-45cd-b823-c63eff37c66a"

# Subpage addresses, as built by tools/build_pages.py. Kept as a literal object
# inside the expression so the patch adds no new declaration to the component.
PAGE_MAP_JS = (
    "({ai:'services/ai-tools.html',apps:'services/web-apps.html',"
    "web:'services/websites.html',software:'services/software.html'})[s.id]"
)

# --------------------------------------------------------------------------- #
# 1. The contact form did not send.
#
# The export's handler set the "sent" state and posted nothing, so the page
# showed "Danke - Ihre Nachricht ist da." while the enquiry was discarded.
# Measured on the deployed site: zero non-GET requests.
#
# Web3Forms is not a new decision - the previous site posted this same form with
# this same public key, and the REVIEWED privacy policy names it as the
# processor of the contact form. The key identifies the destination inbox and is
# public by design.
#
# Progressive enhancement, so there is no single point of failure: a real action
# and method (works with JavaScript off), fetch() for an inline answer, the
# browser's own submit as the fallback with a redirect back to the contact page.
# The thank-you appears ONLY on a successful response.
# --------------------------------------------------------------------------- #
FORM_TAG = (
    '<form onSubmit="{{ formSubmit }}" style="display:grid; gap:16px; position:relative">',
    '<form onSubmit="{{ formSubmit }}" method="POST" '
    'action="https://api.web3forms.com/submit" '
    'style="display:grid; gap:16px; position:relative">\n'
    f'      <input type="hidden" name="access_key" value="{WEB3FORMS_KEY}">\n'
    '      <input type="hidden" name="subject" value="Anfrage über mccain-digital.com">\n'
    '      <input type="hidden" name="from_name" value="mccain-digital.com">\n'
    '      <input type="hidden" name="redirect" value="https://mccain-digital.com/kontakt.html?sent=1">',
)

FORM_HANDLER = (
    "formSubmit = (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); "
    "if (fd.get('company')) return; this.setState({ formSent: true }); };",

    "formSubmit = (e) => { e.preventDefault(); const form = e.currentTarget; "
    "const fd = new FormData(form); if (fd.get('company')) return; "
    "fetch(form.action, { method: 'POST', body: fd })"
    ".then((r) => r.json())"
    ".then((d) => { if (!d || d.success !== true) throw new Error('rejected'); "
    "this.setState({ formSent: true }); })"
    ".catch(() => { form.submit(); }); };",
)

# --------------------------------------------------------------------------- #
# 2. The footer opened modals instead of linking to pages.
#
# The four service pages and the contact page exist again (they were live on the
# previous site and 404ed after the relaunch). Nothing on the start page pointed
# at them, which makes them orphans: reachable by URL, unreachable by reading.
#
# The service tiles in #services still open their modals - that interaction is
# untouched. It is the FOOTER that becomes real navigation, which is what a
# footer is for.
# --------------------------------------------------------------------------- #
FOOTER_SERVICES = (
    "{ title: t.footer.services, links: services.map((s) => ({ label: s.title, "
    "href: '#services', target: '_self', onClick: (e) => { e.preventDefault(); "
    "this.openModal('service', s.id); } })) },",

    "{ title: t.footer.services, links: services.map((s) => ({ label: s.title, "
    f"href: {PAGE_MAP_JS}, target: '_self' }})) }},",
)

FOOTER_CONTACT = (
    "{ label: t.footer.contact, href: '#contact', target: '_self', onClick: this.goHandler('contact') }",
    "{ label: t.footer.contact, href: 'kontakt.html', target: '_self' }",
)

PATCHES = [
    ("contact form tag", FORM_TAG),
    ("contact form handler", FORM_HANDLER),
    ("footer service links", FOOTER_SERVICES),
    ("footer contact link", FOOTER_CONTACT),
]


def main():
    touched = 0
    for path in TARGETS:
        if not os.path.exists(path):
            sys.exit(f"patch_export: missing {path}")
        s = io.open(path, encoding="utf-8").read()
        name = os.path.basename(path)
        applied, already = [], []

        for label, (old, new) in PATCHES:
            if new in s:
                already.append(label)
                continue
            n = s.count(old)
            if n != 1:
                sys.exit(
                    f"ABORT {name}: patch '{label}' expected exactly 1 match, found {n}.\n"
                    "  The export has changed shape. Read it and update this script -\n"
                    "  do not force it through: one of these patches is a contact form."
                )
            s = s.replace(old, new)
            applied.append(label)

        if applied:
            io.open(path, "w", encoding="utf-8", newline="\n").write(s)
            touched += 1
        print(f"  {name:<36} {len(applied)} applied, {len(already)} already in place")
        for label in applied:
            print(f"      + {label}")

    if touched:
        print("\nRebuild so the deployed page carries it:  node tools/prerender.mjs")
    else:
        print("\nnothing to do - the export already carries every patch")


if __name__ == "__main__":
    main()
