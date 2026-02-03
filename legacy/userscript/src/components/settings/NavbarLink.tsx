import { Stasharr } from '../../enums/Stasharr';

const NavbarLink = () => (
  <a
    class="nav-link"
    data-bs-toggle="modal"
    data-bs-target={Stasharr.DOMSelector.SettingsModal}
    href="#"
  >
    Stasharr
  </a>
);

export default NavbarLink;
