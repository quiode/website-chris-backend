#!/bin/bash
cd ../Website-Chris/ && sudo rm -r dist && git pull && ng build && sudo rm -r ../website-chris-backend/website/* && sudo cp -r dist/website-chris/* ../website-chris-backend/website/ && cd ../website-chris-backend/ && sudo systemctl stop chris.service && git pull && sudo rm -r dist && npm run build && sudo systemctl start chris.service
