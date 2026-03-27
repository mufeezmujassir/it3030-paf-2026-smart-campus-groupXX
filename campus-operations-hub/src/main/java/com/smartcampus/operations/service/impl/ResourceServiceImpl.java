package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.ResourceCreateRequest;
import com.smartcampus.operations.dto.ResourceResponse;
import com.smartcampus.operations.dto.ResourceUpdateRequest;
import com.smartcampus.operations.entity.Resource;
import com.smartcampus.operations.exception.ResourceNotFoundException;
import com.smartcampus.operations.mapper.ResourceMapper;
import com.smartcampus.operations.repository.ResourceRepository;
import com.smartcampus.operations.repository.ResourceSpecification;
import com.smartcampus.operations.service.ResourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceMapper resourceMapper;

    @Override
    @Transactional
    public ResourceResponse createResource(ResourceCreateRequest request) {
        Resource resource = resourceMapper.toEntity(request);
        resource.setImageId(request.getImageId());
        Resource saved = resourceRepository.save(resource);
        log.info("Resource created: {}", saved.getName());
        return resourceMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ResourceResponse updateResource(UUID id, ResourceUpdateRequest request) {
        Resource existing = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        existing.setName(request.getName());
        existing.setType(request.getType());
        existing.setSubtype(request.getSubtype());
        existing.setCapacity(request.getCapacity());
        existing.setLocation(request.getLocation());
        existing.setStatus(request.getStatus());
        if (request.getImageId() != null) {
            existing.setImageId(request.getImageId());
        }


        Resource updated = resourceRepository.save(existing);
        log.info("Resource updated: {}", updated.getId());
        return resourceMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteResource(UUID id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found with id: " + id);
        }
        resourceRepository.deleteById(id);
        log.info("Resource deleted: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public ResourceResponse getResourceById(UUID id) {
        Resource r = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        return resourceMapper.toResponse(r);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ResourceResponse> getAllResources(String type, String subtype, Integer minCapacity, Integer maxCapacity, String location, String status, String keyword, Pageable pageable) {
        var spec = ResourceSpecification.build(type, subtype, minCapacity, maxCapacity, location, status, keyword);
        return resourceRepository.findAll(spec, pageable).map(resourceMapper::toResponse);
    }


}
