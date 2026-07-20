{
  description = "Bill Splitter - static website for splitting bills with friends";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: rec {
        bill-splitter = pkgs.stdenvNoCC.mkDerivation {
          pname = "bill-splitter";
          version = "1.0.0";

          src = self;

          dontBuild = true;

          installPhase = ''
            runHook preInstall

            mkdir -p $out/dist
            cp index.html styles.css app.js llms.txt ai-context.json $out/dist/

            runHook postInstall
          '';
        };

        default = bill-splitter;
      });
    };
}
