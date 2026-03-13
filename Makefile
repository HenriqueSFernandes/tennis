REGISTRY  = registry.henriquesf.me
API_IMAGE = $(REGISTRY)/rio-tinto-api
FE_IMAGE  = $(REGISTRY)/rio-tinto-frontend
SHA       = $(shell git rev-parse --short HEAD)

.PHONY: build push release help

help:
	@echo "Available targets:"
	@echo "  build    Build both images (tags: <sha>, latest)"
	@echo "  push     Push both images to $(REGISTRY)"
	@echo "  release  build + push"

build:
	docker build -t $(API_IMAGE):$(SHA) -t $(API_IMAGE):latest ./api
	docker build \
		--build-arg VITE_API_URL=$(VITE_API_URL) \
		-t $(FE_IMAGE):$(SHA) -t $(FE_IMAGE):latest ./frontend

push:
	docker push $(API_IMAGE):$(SHA)
	docker push $(API_IMAGE):latest
	docker push $(FE_IMAGE):$(SHA)
	docker push $(FE_IMAGE):latest

release: build push
