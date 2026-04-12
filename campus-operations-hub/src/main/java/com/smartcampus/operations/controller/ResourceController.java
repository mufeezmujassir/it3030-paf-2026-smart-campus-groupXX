package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.ResourceCreateRequest;
import com.smartcampus.operations.dto.ResourceResponse;
import com.smartcampus.operations.dto.ResourceUpdateRequest;
import com.smartcampus.operations.entity.ResourceType;
import com.smartcampus.operations.service.ResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import java.io.IOException;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;
    private final com.smartcampus.operations.repository.ResourceImageRepository imageRepository;
    private final com.smartcampus.operations.repository.ResourceRepository resourceRepository;

    @GetMapping
    public ResponseEntity<Page<ResourceResponse>> listResources(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String subtype,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer maxCapacity,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            Pageable pageable
    ) {
        Page<ResourceResponse> page = resourceService.getAllResources(type, subtype, minCapacity, maxCapacity, location, status, keyword, pageable);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getById(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    @GetMapping("/types")
    public ResponseEntity<String[]> getTypes() {
        String[] types = Arrays.stream(ResourceType.values()).map(Enum::name).toArray(String[]::new);
        return ResponseEntity.ok(types);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> create(@RequestPart("data") String data,
                                                   @RequestPart(value = "file", required = false) MultipartFile file,
                                                   @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        ResourceCreateRequest req = mapper.readValue(data, ResourceCreateRequest.class);
        if (file != null && !file.isEmpty()) {
            com.smartcampus.operations.entity.ResourceImage img = com.smartcampus.operations.entity.ResourceImage.builder()
                    .data(file.getBytes())
                    .contentType(file.getContentType())
                    .originalFilename(file.getOriginalFilename())
                    .build();
            com.smartcampus.operations.entity.ResourceImage saved = imageRepository.save(img);
            req.setImageId(saved.getId());
        }
        ResourceResponse resp = resourceService.createResource(req, userDetails.getUsername());
        return new ResponseEntity<>(resp, HttpStatus.CREATED);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> update(@PathVariable java.util.UUID id,
                                                   @RequestPart("data") String data,
                                                   @RequestPart(value = "file", required = false) MultipartFile file,
                                                   @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        ResourceUpdateRequest req = mapper.readValue(data, ResourceUpdateRequest.class);
        if (file != null && !file.isEmpty()) {
            com.smartcampus.operations.entity.ResourceImage img = com.smartcampus.operations.entity.ResourceImage.builder()
                    .data(file.getBytes())
                    .contentType(file.getContentType())
                    .originalFilename(file.getOriginalFilename())
                    .build();
            com.smartcampus.operations.entity.ResourceImage saved = imageRepository.save(img);
            req.setImageId(saved.getId());
        }
        return ResponseEntity.ok(resourceService.updateResource(id, req, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> delete(@PathVariable java.util.UUID id,
                                         @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        resourceService.deleteResource(id, userDetails.getUsername());
        return ResponseEntity.ok("Resource deleted successfully");
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        com.smartcampus.operations.entity.ResourceImage img = com.smartcampus.operations.entity.ResourceImage.builder()
                .data(file.getBytes())
                .contentType(file.getContentType())
                .originalFilename(file.getOriginalFilename())
                .build();

        com.smartcampus.operations.entity.ResourceImage saved = imageRepository.save(img);
        String url = "/api/resources/images/" + saved.getId();
        return ResponseEntity.ok(url);
    }

    @GetMapping("/images/{id}")
    public ResponseEntity<byte[]> serveImage(@PathVariable UUID id) {
        java.util.Optional<com.smartcampus.operations.entity.ResourceImage> opt = imageRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        return buildImageResponse(opt.get(), id);
    }

    @GetMapping("/{resourceId}/image")
    public ResponseEntity<byte[]> serveResourceImage(@PathVariable UUID resourceId) {
        java.util.Optional<com.smartcampus.operations.entity.Resource> optResource = resourceRepository.findById(resourceId);
        if (optResource.isEmpty()) return ResponseEntity.notFound().build();

        com.smartcampus.operations.entity.Resource resource = optResource.get();
        UUID imageId = resource.getImageId();

        if (imageId == null) return ResponseEntity.notFound().build();

        java.util.Optional<com.smartcampus.operations.entity.ResourceImage> optImage = imageRepository.findById(imageId);
        if (optImage.isEmpty()) return ResponseEntity.notFound().build();

        return buildImageResponse(optImage.get(), imageId);
    }

    private ResponseEntity<byte[]> buildImageResponse(com.smartcampus.operations.entity.ResourceImage img, UUID imageId) {
        String contentType = img.getContentType();
        if (contentType == null) contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        byte[] payload = normalizeImagePayload(img.getData());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + (img.getOriginalFilename() == null ? imageId.toString() : img.getOriginalFilename()) + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(payload);
    }

    private boolean isLikelyBase64(String value) {
        if (value == null || value.isBlank() || value.length() < 16) {
            return false;
        }
        if (value.length() % 4 != 0) {
            return false;
        }
        return value.matches("^[A-Za-z0-9+/=\\r\\n]+$");
    }

    private byte[] normalizeImagePayload(byte[] payload) {
        if (payload == null || payload.length == 0) {
            return payload;
        }

        String asText = new String(payload, StandardCharsets.UTF_8).trim();

        // Legacy BYTEA textual form: \xFFD8...
        if (isLikelyHexBytea(asText)) {
            byte[] decoded = decodeHexBytea(asText);
            if (decoded != null) return decoded;
        }

        // Legacy base64 text form.
        if (isLikelyBase64(asText)) {
            try {
                return Base64.getDecoder().decode(asText);
            } catch (IllegalArgumentException ignored) {
                // Keep raw payload if decode fails.
            }
        }
        return payload;
    }

    private boolean isLikelyHexBytea(String value) {
        return value != null && value.startsWith("\\x") && value.length() > 6 && value.substring(2).matches("^[0-9a-fA-F]+$");
    }

    private byte[] decodeHexBytea(String value) {
        try {
            String hex = value.substring(2);
            int len = hex.length();
            if (len % 2 != 0) return null;
            byte[] out = new byte[len / 2];
            for (int i = 0; i < len; i += 2) {
                out[i / 2] = (byte) Integer.parseInt(hex.substring(i, i + 2), 16);
            }
            return out;
        } catch (Exception ignored) {
            return null;
        }
    }
}
