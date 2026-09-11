# Makes the start page's contact form actually send.
#
#     python tools/fix_contact_form.py
#
# WHAT WAS WRONG
# The handler in the Claude Design export was:
#
#     formSubmit = (e) => {
#       e.preventDefault();
#       const fd = new FormData(e.currentTarget);
#       if (fd.get('company')) return;
#       this.setState({ formSent: true });
#     };
#
# It posted nothing. It set the "sent" state, which swaps the form for
# "Danke - Ihre Nachricht ist da. Sie horen innerhalb von 24 Stunden von
# Christian oder Kathi." Measured against the deployed site on 11.9.2026:
# zero non-GET requests, thank-you shown, form removed from the DOM. Every
# enquiry was discarded while the sender was told it had arrived - a worse
# failure than a broken link, because nobody on either side finds out.
#
# WHY WEB3FORMS
# Not a new decision. The previous site posted this same form to Web3Forms with
# this same public key, and the REVIEWED privacy policy names it: "The contact
# form is processed via Web3Forms". Restoring that is restoring the documented
# behaviour. The key identifies the destination inbox and is public by design.
#
# HOW
# Progressive enhancement, so there is no single point of failure:
#   - the <form> gets a real action and method, so it works with no JS at all
#   - the handler tries fetch() and shows the thank-you ONLY on success
#   - if the request fails it falls back to the browser's own submit, with a
#     redirect field bringing the visitor back to /kontakt.html?sent=1
# The one outcome that must not be possible is the old one: reporting success
# without having sent. tools/verify_site.mjs now checks that every form has a
# usable action.
#
# This edits the Claude Design export, which is the build's source. A fresh
# export from Claude Design would overwrite it - re-run this script afterwards,
# it refuses to run twice and tells you if the ground has moved.
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)

TARGETS = [
    os.path.join(SITE, "mccain-design-system", "reference", "index.html"),
    os.path.join(SITE, "mccain-design-system", "reference", "McCain Digital v2.dc.html"),
]

KEY = "d3e1fa0a-cbe1-45cd-b823-c63eff37c66a"

OLD_FORM = '<form onSubmit="{{ formSubmit }}" style="display:grid; gap:16px; position:relative">'
NEW_FORM = (
    '<form onSubmit="{{ formSubmit }}" method="POST" '
    'action="https://api.web3forms.com/submit" '
    'style="display:grid; gap:16px; position:relative">\n'
    f'      <input type="hidden" name="access_key" value="{KEY}">\n'
    '      <input type="hidden" name="subject" value="Anfrage über mccain-digital.com">\n'
    '      <input type="hidden" name="from_name" value="mccain-digital.com">\n'
    '      <input type="hidden" name="redirect" value="https://mccain-digital.com/kontakt.html?sent=1">'
)

OLD_JS = (
    "formSubmit = (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); "
    "if (fd.get('company')) return; this.setState({ formSent: true }); };"
)
NEW_JS = (
    "formSubmit = (e) => { e.preventDefault(); const form = e.currentTarget; "
    "const fd = new FormData(form); if (fd.get('company')) return; "
    "fetch(form.action, { method: 'POST', body: fd })"
    ".then((r) => r.json())"
    ".then((d) => { if (!d || d.success !== true) throw new Error('rejected'); "
    "this.setState({ formSent: true }); })"
    ".catch(() => { form.submit(); }); };"
)


def main():
    changed = 0
    for path in TARGETS:
        if not os.path.exists(path):
            sys.exit(f"fix_contact_form: missing {path}")
        s = io.open(path, encoding="utf-8").read()

        if NEW_JS in s and "api.web3forms.com" in s:
            print(f"  {os.path.basename(path):<42} already wired - nothing to do")
            continue

        for old, new, what in ((OLD_FORM, NEW_FORM, "form tag"), (OLD_JS, NEW_JS, "handler")):
            n = s.count(old)
            if n != 1:
                sys.exit(
                    f"ABORT {os.path.basename(path)}: expected exactly 1 {what}, found {n}.\n"
                    "  The export has changed shape. Read it before forcing this through -\n"
                    "  a contact form is not something to patch with a guess."
                )
            s = s.replace(old, new)

        io.open(path, "w", encoding="utf-8", newline="\n").write(s)
        print(f"  {os.path.basename(path):<42} form tag + handler rewired")
        changed += 1

    if changed:
        print("\nRebuild so the deployed page carries it:  node tools/prerender.mjs")


if __name__ == "__main__":
    main()
